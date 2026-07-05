import { useState } from "react";
import Auth from "./Auth";
import Room from "./Room";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState("room");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  if (!user) {
    return <Auth onAuthSuccess={setUser} />;
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div className="brand">Sessions<span>.</span></div>
          <div className="nav-tabs">
            <button
              className={`nav-tab ${view === "room" ? "active" : ""}`}
              onClick={() => setView("room")}
            >
              Room
            </button>
            <button
              className={`nav-tab ${view === "dashboard" ? "active" : ""}`}
              onClick={() => setView("dashboard")}
            >
              Dashboard
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span className="user-chip">{user.name}</span>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </div>
      </div>

      {view === "room" ? <Room /> : <Dashboard />}
    </div>
  );
}

export default App;