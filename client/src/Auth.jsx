import { useState } from "react";
import api from "./lib/api";

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await api.post(endpoint, body);

      // Save the token and user, then tell the app we're logged in
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <div style={{ maxWidth: "360px", margin: "4rem auto", padding: "1rem" }}>
      <h1>Riverside Clone</h1>
      <h2>{isLogin ? "Log in" : "Sign up"}</h2>

      {error && <p style={{ color: "tomato" }}>{error}</p>}

      {!isLogin && (
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", width: "100%", margin: "0.5rem 0", padding: "0.5rem" }}
        />
      )}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", margin: "0.5rem 0", padding: "0.5rem" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", margin: "0.5rem 0", padding: "0.5rem" }}
      />

      <button onClick={handleSubmit} style={{ width: "100%", padding: "0.5rem" }}>
        {isLogin ? "Log in" : "Sign up"}
      </button>

      <p style={{ marginTop: "1rem", color: "#888" }}>
        {isLogin ? "No account?" : "Already have an account?"}{" "}
        <button
          onClick={() => { setIsLogin(!isLogin); setError(""); }}
          style={{ background: "none", border: "none", color: "#6cf", cursor: "pointer" }}
        >
          {isLogin ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}

export default Auth;