import { useState } from "react";
import Auth from "./Auth";
import Room from "./Room";

function App() {
  // If a user is already saved from a previous session, start logged in
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

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
      <div style={{ padding: "0.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#888" }}>Logged in as {user.name}</span>
        <button onClick={logout}>Log out</button>
      </div>
      <Room />
    </div>
  );
}

export default App;