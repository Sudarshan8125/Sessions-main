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
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <div className="meet-landing">
      {/* Left: headline + form */}
      <div className="meet-left">
        <div className="meet-brand">Sessions<span className="dot">.</span></div>
        <h1 className="meet-title">
          Secure video recording<br />for everyone
        </h1>
        <p className="meet-sub">
          Record studio-quality video and audio with anyone, anywhere —
          each track captured locally and saved to the cloud.
        </p>

        <div className="meet-form">
          {error && <p className="error-text">{error}</p>}

          {!isLogin && (
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={handleSubmit} style={{ width: "100%", marginTop: "0.75rem" }}>
            {isLogin ? "Log in" : "Get started"}
          </button>

          <p className="mt muted" style={{ fontSize: "0.9rem" }}>
            {isLogin ? "No account?" : "Already have an account?"}{" "}
            <button className="link-btn" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: friendly illustration */}
      <div className="meet-illustration">
        <svg width="380" height="340" viewBox="0 0 380 340" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="190" cy="170" r="160" fill="#e8f0fe" />
          {/* screen card */}
          <rect x="80" y="95" width="220" height="140" rx="16" fill="#ffffff" stroke="#dadce0" strokeWidth="2" />
          {/* two people */}
          <circle cx="140" cy="150" r="22" fill="#1a73e8" />
          <path d="M112 200c0-16 13-28 28-28s28 12 28 28z" fill="#1a73e8" />
          <circle cx="240" cy="150" r="22" fill="#34a853" />
          <path d="M212 200c0-16 13-28 28-28s28 12 28 28z" fill="#34a853" />
          {/* link glyph */}
          <circle cx="190" cy="255" r="30" fill="#1a73e8" />
          <path d="M181 255a6 6 0 016-6h5v-7h-5a13 13 0 100 26h5v-7h-5a6 6 0 01-6-6zm12-6h5a6 6 0 010 12h-5v7h5a13 13 0 000-26h-5v7zm-6 3h12v6h-12z" fill="#fff" />
        </svg>
        <div className="meet-caption">
          Get a link you can share
          <span>Start a room and invite anyone to record with you.</span>
        </div>
      </div>
    </div>
  );
}

export default Auth;