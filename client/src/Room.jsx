import { useRef, useState, useEffect } from "react";
import socket from "./lib/socket";
import api from "./lib/api";


// A public STUN server helps each browser discover its own public address
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};


function Room() {
  const videoRef = useRef(null);          // our own video
  const remoteVideoRef = useRef(null);    // the other person's video
  const streamRef = useRef(null);         // our local MediaStream
  const pcRef = useRef(null);             // the RTCPeerConnection
  const pendingCandidates = useRef([]);   // ICE candidates that arrive too early
  const recorderRef = useRef(null);          // the MediaRecorder instance
  const recordedChunksRef = useRef([]);      // collected data chunks

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState(""); // "", "uploading", "uploaded", "failed"

  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState("");

  const roomId =
    new URLSearchParams(window.location.search).get("room") || "test-room";

  // Build a fresh peer connection and wire up its events
  function createPeerConnection() {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add our local audio+video tracks so the other side receives them
    streamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current);
    });

    // Each time we discover a network path, send it to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    // When the remote media arrives, show it in the remote <video>
    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Handy for debugging: log the connection state as it progresses
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }

  // Add any ICE candidates that arrived before the remote description was set
  async function flushCandidates() {
    for (const c of pendingCandidates.current) {
      try {
        await pcRef.current.addIceCandidate(c);
      } catch (e) {
        console.error("Error adding queued candidate:", e);
      }
    }
    pendingCandidates.current = [];
  }

  useEffect(() => {
    // Someone joined AFTER us → we are the initiator → we send the offer
    socket.on("user-joined", async () => {
      console.log("Peer joined, creating offer...");
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
    });

    // We received an offer → we are the receiver → we answer
    socket.on("offer", async ({ offer }) => {
      console.log("Received offer, creating answer...");
      const pc = createPeerConnection();
      await pc.setRemoteDescription(offer);
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    });

    // Our offer was answered
    socket.on("answer", async ({ answer }) => {
      console.log("Received answer.");
      await pcRef.current.setRemoteDescription(answer);
      await flushCandidates();
    });

    // A network-path candidate arrived from the other peer
    socket.on("ice-candidate", async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate);
      } else {
        // Remote description not set yet → hold onto it for later
        pendingCandidates.current.push(candidate);
      }
    });

    // The other peer left → clear their video and close the connection
    socket.on("user-left", () => {
      console.log("Peer left.");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    });

    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, []);

  async function joinRoom() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setJoined(true);

      socket.connect();
      socket.emit("join-room", roomId);
      console.log("Joined room:", roomId);
    } catch (err) {
      setError("Could not access camera/mic: " + err.message);
    }
  }

  function leaveRoom() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setJoined(false);
    socket.disconnect();
  }

  function toggleMic() {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  }

  function toggleCam() {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  }

  function startRecording() {
    if (!streamRef.current) return;

    recordedChunksRef.current = []; // reset from any previous recording
    setRecordedUrl("");

    // Record OUR local stream at full quality (not the peer's compressed feed)
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm",
    });

    // Fires repeatedly as data becomes available — collect each chunk
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    // Fires once when we stop — stitch the chunks into one file
    recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob); // local preview URL
        setRecordedUrl(url);
  
        // Now upload the recording to the server (which pushes it to S3)
        await uploadRecording(blob);
      };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop(); // triggers onstop above
    setIsRecording(false);
  }

  async function uploadRecording(blob) {
    try {
      setUploadStatus("uploading");

      // Build multipart form data: the file + which room it belongs to
      const formData = new FormData();
      formData.append("recording", blob, "recording.webm");
      formData.append("sessionCode", roomId);

      const res = await api.post("/uploads", formData);
      console.log("Uploaded:", res.data.track.url);
      setUploadStatus("uploaded");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus("failed");
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1>Riverside Clone</h1>
      <p style={{ color: "#888" }}>Room: {roomId}</p>

      {error && <p style={{ color: "tomato" }}>{error}</p>}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <p style={{ margin: "0 0 0.25rem", color: "#888" }}>You</p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              background: "#000",
              borderRadius: "8px",
              transform: "scaleX(-1)",
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: "300px" }}>
          <p style={{ margin: "0 0 0.25rem", color: "#888" }}>Peer</p>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              background: "#000",
              borderRadius: "8px",
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        {!joined ? (
          <button onClick={joinRoom}>Join</button>
        ) : (
          <>
            <button onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</button>
            <button onClick={toggleCam}>
              {camOn ? "Camera Off" : "Camera On"}
            </button>
            <button onClick={leaveRoom}>Leave</button>
            {!isRecording ? (
              <button onClick={startRecording}>Start Recording</button>
            ) : (
              <button onClick={stopRecording}>Stop Recording</button>
            )}
          </>
        )}
      </div>
      {recordedUrl && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#888" }}>Your recording:</p>
          {uploadStatus === "uploading" && <p style={{ color: "#fc0" }}>Uploading to cloud…</p>}
          {uploadStatus === "uploaded" && <p style={{ color: "#6f6" }}>✓ Uploaded to cloud</p>}
          {uploadStatus === "failed" && <p style={{ color: "tomato" }}>Upload failed</p>}
          <video
            src={recordedUrl}
            controls
            style={{ width: "100%", maxWidth: "480px", borderRadius: "8px" }}
          />
          <div style={{ marginTop: "0.5rem" }}>
            <a href={recordedUrl} download="my-recording.webm" style={{ color: "#6cf" }}>
              Download recording
            </a>
          </div>
        </div>
      )}
    </div>
    
  );
}

export default Room;