import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function TestLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMsg("Calling supabase...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setStatus("error");
        setMsg("Error: " + error.message);
        return;
      }

      setMsg("Login OK! User: " + data.user.email + " — redirecting...");
      setStatus("done");

      setTimeout(() => navigate("/test-success"), 1000);

    } catch (err) {
      setStatus("error");
      setMsg("Caught exception: " + err.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "monospace", background: "#f5f5f5", gap: 16, padding: 32
    }}>
      <h2 style={{ fontSize: "1.2rem" }}>🧪 Supabase Login Test</h2>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10, width: 300 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: "10px", border: "1px solid #ccc", borderRadius: 4 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ padding: "10px", border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: "10px", background: "#333", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          {status === "loading" ? "Logging in..." : "Log In"}
        </button>
      </form>

      {msg && (
        <div style={{
          marginTop: 16, padding: "12px 20px", borderRadius: 6, maxWidth: 400,
          background: status === "error" ? "#fee" : status === "done" ? "#efe" : "#eef",
          border: `1px solid ${status === "error" ? "#fcc" : status === "done" ? "#cfc" : "#ccf"}`,
          fontSize: "0.85rem", wordBreak: "break-all"
        }}>
          {msg}
        </div>
      )}
    </div>
  );
}