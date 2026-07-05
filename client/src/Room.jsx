import { useRef, useState, useEffect } from "react";
import socket from "./lib/socket";
import api from "./lib/api";


// A public STUN server helps each browser discover its own public address
const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "3744129045336ad873e2c9b8",
        credential: "GkDsFV3X8a1Y6nau",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "3744129045336ad873e2c9b8",
        credential: "GkDsFV3X8a1Y6nau",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "3744129045336ad873e2c9b8",
        credential: "GkDsFV3X8a1Y6nau",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "3744129045336ad873e2c9b8",
        credential: "GkDsFV3X8a1Y6nau",
      },
    ],
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

  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerRef = useRef(null);

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

    // start the on-screen timer
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop(); // triggers onstop above
    setIsRecording(false);

    // stop the timer
    clearInterval(timerRef.current);
  }

  function formatTime(s) {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
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
    <div className="studio">
      {/* Top status bar */}
      <div className="studio-bar">
        <span className="pill">Room: {roomId}</span>
        {isRecording && (
          <span className="rec-dot">REC {formatTime(recordSeconds)}</span>
        )}
        {uploadStatus === "uploading" && (
          <span className="upload-chip">↑ Uploading…</span>
        )}
        {uploadStatus === "uploaded" && (
          <span className="upload-chip" style={{ color: "var(--success)" }}>
            ✓ Uploaded to cloud
          </span>
        )}
        {uploadStatus === "failed" && (
          <span className="upload-chip" style={{ color: "var(--danger)" }}>
            Upload failed
          </span>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* Video stage */}
      <div className="stage">
        <div className="tile">
          <video ref={videoRef} autoPlay playsInline muted className="mirror" />
          <span className="name-tag">You</span>
        </div>

        <div className="tile empty">
          <video ref={remoteVideoRef} autoPlay playsInline />
          {!joined && <span>Waiting for peer…</span>}
          <span className="name-tag">Peer</span>
        </div>
      </div>

      {/* Control bar */}
      <div className="control-bar">
        {!joined ? (
          <button onClick={joinRoom}>Join Studio</button>
        ) : (
          <>
            <button className={`ctrl ${micOn ? "" : "off"}`} onClick={toggleMic}>
              {micOn ? "Mic on" : "Mic off"}
            </button>
            <button className={`ctrl ${camOn ? "" : "off"}`} onClick={toggleCam}>
              {camOn ? "Cam on" : "Cam off"}
            </button>
            {!isRecording ? (
              <button className="ctrl rec" onClick={startRecording}>
                ● Record
              </button>
            ) : (
              <button className="ctrl rec" onClick={stopRecording}>
                ■ Stop {formatTime(recordSeconds)}
              </button>
            )}
            <button className="ctrl leave" onClick={leaveRoom}>
              Leave
            </button>
          </>
        )}
      </div>

      {/* Local recording preview (kept for you to review before it's in the dashboard) */}
      {recordedUrl && (
        <div className="card" style={{ maxWidth: "480px", margin: "1.5rem auto 0" }}>
          <p className="muted" style={{ marginBottom: "0.5rem" }}>Last recording</p>
          <video
            src={recordedUrl}
            controls
            style={{ width: "100%", borderRadius: "var(--radius-sm)" }}
          />
        </div>
      )}
    </div>
  );
}

export default Room;