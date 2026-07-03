import { useState, useEffect } from "react";
import api from "./lib/api";

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [playUrls, setPlayUrls] = useState({}); // trackId -> signed url
  const [loading, setLoading] = useState(true);

  // Load the user's sessions on mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await api.get("/sessions");
        setSessions(res.data.sessions);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  // When a session is picked, load its tracks
  async function openSession(session) {
    setSelectedSession(session);
    setTracks([]);
    setPlayUrls({});
    try {
      const res = await api.get(`/sessions/${session._id}/tracks`);
      setTracks(res.data.tracks);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    }
  }

  // Fetch a fresh signed URL for a track, then it becomes playable
  async function loadPlayback(trackId) {
    try {
      const res = await api.get(`/sessions/track/${trackId}/play`);
      setPlayUrls((prev) => ({ ...prev, [trackId]: res.data.url }));
    } catch (err) {
      console.error("Failed to get playback url:", err);
    }
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading sessions…</p>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h2>Dashboard</h2>

      {sessions.length === 0 ? (
        <p style={{ color: "#888" }}>
          No sessions yet. Record something in a room first!
        </p>
      ) : (
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          {/* Session list */}
          <div style={{ minWidth: "220px" }}>
            <h3>Sessions</h3>
            {sessions.map((s) => (
              <div
                key={s._id}
                onClick={() => openSession(s)}
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background:
                    selectedSession?._id === s._id ? "#333" : "#222",
                }}
              >
                <div>{s.title || "Untitled session"}</div>
                <div style={{ fontSize: "0.8rem", color: "#888" }}>
                  Code: {s.code}
                </div>
              </div>
            ))}
          </div>

          {/* Tracks for the selected session */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            {selectedSession && (
              <>
                <h3>Recordings</h3>
                {tracks.length === 0 ? (
                  <p style={{ color: "#888" }}>No recordings in this session.</p>
                ) : (
                  tracks.map((t) => (
                    <div
                      key={t._id}
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1rem",
                        background: "#222",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>{t.user?.name || "Unknown"}</strong>{" "}
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color:
                              t.status === "uploaded" ? "#6f6" : "#fc0",
                          }}
                        >
                          ({t.status})
                        </span>
                      </div>

                      {playUrls[t._id] ? (
                        <video
                          src={playUrls[t._id]}
                          controls
                          style={{ width: "100%", borderRadius: "6px" }}
                        />
                      ) : (
                        <button onClick={() => loadPlayback(t._id)}>
                          Load recording
                        </button>
                      )}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;