import { useState, useEffect } from "react";
import api from "./lib/api";

function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [playUrls, setPlayUrls] = useState({});
  const [loading, setLoading] = useState(true);

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

  async function loadPlayback(trackId) {
    try {
      const res = await api.get(`/sessions/track/${trackId}/play`);
      setPlayUrls((prev) => ({ ...prev, [trackId]: res.data.url }));
    } catch (err) {
      console.error("Failed to get playback url:", err);
    }
  }

  if (loading) return <div className="page"><p className="muted">Loading sessions…</p></div>;

  return (
    <div className="page">
      <h2 style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>Your Studio</h2>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        All your recorded sessions in one place.
      </p>

      {sessions.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No sessions yet. Head to the Room and record something first!
          </p>
        </div>
      ) : (
        <div className="dash-grid">
          {/* Session list */}
          <div style={{ minWidth: "240px" }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Sessions
            </h3>
            {sessions.map((s) => (
              <div
                key={s._id}
                onClick={() => openSession(s)}
                className={`session-item ${selectedSession?._id === s._id ? "active" : ""}`}
              >
                <div style={{ fontWeight: 600 }}>{s.title || "Untitled session"}</div>
                <div className="code">Code: {s.code}</div>
              </div>
            ))}
          </div>

          {/* Tracks */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            {selectedSession ? (
              <>
                <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Recordings
                </h3>
                {tracks.length === 0 ? (
                  <p className="muted">No recordings in this session.</p>
                ) : (
                  tracks.map((t) => (
                    <div key={t._id} className="card" style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                        <strong>{t.user?.name || "Unknown"}</strong>
                        <span className={`badge badge-${t.status}`}>{t.status}</span>
                      </div>

                      {playUrls[t._id] ? (
                        <video
                          src={playUrls[t._id]}
                          controls
                          style={{ width: "100%", borderRadius: "var(--radius-sm)" }}
                        />
                      ) : (
                        <button className="btn-ghost" onClick={() => loadPlayback(t._id)}>
                          ▶ Load recording
                        </button>
                      )}
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="card">
                <p className="muted" style={{ margin: 0 }}>
                  Select a session on the left to see its recordings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;