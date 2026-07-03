import { useState } from "react";
import Auth from "./Auth";
import Room from "./Room";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState("room"); // "room" or "dashboard"

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
      <div
        style={{
          padding: "0.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#111",
        }}
      >
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => setView("room")}>Room</button>
          <button onClick={() => setView("dashboard")}>Dashboard</button>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ color: "#888" }}>Logged in as {user.name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </div>

      {view === "room" ? <Room /> : <Dashboard />}
    </div>
  );
}

export default App;