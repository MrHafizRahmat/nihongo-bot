import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, getProfileRole } = useAuth();

  const [mode, setMode] = useState("login");       // "login" | "register"
  const [role, setRole] = useState("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "register" && !fullName) { setError("Please enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);

    if (mode === "login") {
      const { data, error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message === "Invalid login credentials"
          ? "Wrong email or password. Please try again."
          : signInError.message);
        setLoading(false);
        return;
      }
      // Fetch role directly from profiles table — works for all accounts
      const userRole = await getProfileRole(data.user.id);
      navigate(`/dashboard/${userRole}`);

    } else {
      const { error: signUpError } = await signUp(email, password, role, fullName);
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setSuccessMsg("✅ Account created! Please check your email to confirm, then log in.");
      setMode("login");
    }

    setLoading(false);
  };

  const isLogin = mode === "login";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=Shippori+Mincho:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #fdf6ee; --ink: #1a1210; --charcoal: #2e2622;
          --rose: #d4697a; --rose-light: #f2b8c0; --gold: #c09050;
          --mist: #e8ddd4; --paper: #faf2e8; --teal: #4a9090;
        }
        body { background: var(--cream); }

        .login-page {
          min-height: 100vh; background: var(--cream);
          display: grid; grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 768px) {
          .login-page { grid-template-columns: 1fr; }
          .login-panel { display: none; }
          .login-form-side { padding: 48px 28px; }
          .back-link { left: 28px !important; }
        }

        /* Left panel */
        .login-panel {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 48px;
          transition: background 0.4s ease;
        }
        .login-panel.student { background: var(--ink); }
        .login-panel.teacher { background: #12201f; }

        .panel-bg { position: absolute; inset: 0; transition: opacity 0.4s; }
        .panel-bg.student { background: radial-gradient(ellipse at 30% 30%, rgba(212,105,122,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(192,144,80,0.12) 0%, transparent 50%); }
        .panel-bg.teacher { background: radial-gradient(ellipse at 30% 30%, rgba(74,144,144,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(192,144,80,0.1) 0%, transparent 50%); }

        .panel-kanji {
          font-family: 'Noto Serif JP', serif; font-size: clamp(4rem, 10vw, 8rem);
          font-weight: 300; color: rgba(255,255,255,0.05);
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          letter-spacing: 0.3em; white-space: nowrap;
          pointer-events: none; user-select: none;
        }
        .panel-content { position: relative; z-index: 2; text-align: center; }
        .panel-kana {
          font-family: 'Noto Serif JP', serif; font-size: 2.8rem; font-weight: 400;
          color: rgba(255,255,255,0.9); letter-spacing: 0.3em;
          display: block; margin-bottom: 14px; transition: all 0.35s ease;
        }
        .panel-divider {
          width: 40px; height: 1.5px; margin: 0 auto 16px;
          border-radius: 2px; transition: background 0.4s;
        }
        .panel-divider.student { background: var(--rose); }
        .panel-divider.teacher { background: var(--teal); }
        .panel-role-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          letter-spacing: 0.18em; text-transform: uppercase; transition: color 0.4s;
        }
        .panel-role-label.student { color: rgba(212,105,122,0.7); }
        .panel-role-label.teacher { color: rgba(74,144,144,0.8); }

        /* Right form side */
        .login-form-side {
          display: flex; flex-direction: column; justify-content: center;
          padding: 64px 68px; position: relative; overflow-y: auto;
        }
        .back-link {
          position: absolute; top: 32px; left: 68px;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #9a8880;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          letter-spacing: 0.04em; border: none; background: none; padding: 0;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--rose); }

        /* Mode tabs */
        .mode-tabs {
          display: flex; gap: 0; margin-bottom: 28px;
          border-bottom: 1.5px solid var(--mist);
        }
        .mode-tab {
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500;
          padding: 10px 20px 12px; background: none; border: none;
          cursor: pointer; color: #b0a098; letter-spacing: 0.04em;
          border-bottom: 2px solid transparent; margin-bottom: -1.5px;
          transition: color 0.2s, border-color 0.2s;
        }
        .mode-tab.active { color: var(--ink); border-bottom-color: var(--rose); }

        /* Role toggle (only shown on register) */
        .role-toggle {
          display: flex; background: var(--mist); border-radius: 8px;
          padding: 4px; margin-bottom: 20px; position: relative;
        }
        .role-btn {
          flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
          font-weight: 500; padding: 10px 0; border: none; background: transparent;
          border-radius: 6px; cursor: pointer; letter-spacing: 0.04em; color: #9a8880;
          transition: color 0.25s; position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .role-btn.active { color: var(--ink); font-weight: 600; }
        .role-pill {
          position: absolute; top: 4px; bottom: 4px; width: calc(50% - 4px);
          border-radius: 6px; background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .role-pill.student { left: 4px; }
        .role-pill.teacher { left: calc(50%); }

        /* Form header */
        .form-header { margin-bottom: 22px; }
        .form-greeting {
          font-family: 'Noto Serif JP', serif; font-size: 1rem;
          letter-spacing: 0.15em; display: block; margin-bottom: 6px; transition: color 0.3s;
        }
        .form-greeting.student { color: var(--rose); }
        .form-greeting.teacher { color: var(--teal); }
        .form-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(1.4rem, 3vw, 1.9rem); font-weight: 600;
          color: var(--ink); line-height: 1.25; margin-bottom: 6px;
        }
        .form-sub {
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
          color: #9a8880; font-weight: 300;
        }

        /* Fields */
        .field { margin-bottom: 16px; }
        .field label {
          display: block; font-family: 'DM Sans', sans-serif; font-size: 0.73rem;
          font-weight: 500; color: var(--charcoal); letter-spacing: 0.1em;
          text-transform: uppercase; margin-bottom: 7px;
        }
        .field input {
          width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.93rem;
          color: var(--ink); background: var(--paper); border: 1.5px solid var(--mist);
          border-radius: 6px; padding: 12px 15px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; appearance: none;
        }
        .field input::placeholder { color: #c0b0a8; }
        .field input:focus {
          border-color: var(--rose-light);
          box-shadow: 0 0 0 3px rgba(212,105,122,0.1);
        }
        .field input.teacher:focus {
          border-color: rgba(74,144,144,0.5);
          box-shadow: 0 0 0 3px rgba(74,144,144,0.1);
        }

        /* Messages */
        .error-msg {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--rose);
          margin-bottom: 14px; padding: 9px 13px;
          background: rgba(212,105,122,0.07); border-radius: 5px;
          border-left: 3px solid var(--rose-light);
        }
        .success-msg {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #4a9090;
          margin-bottom: 14px; padding: 9px 13px;
          background: rgba(74,144,144,0.07); border-radius: 5px;
          border-left: 3px solid rgba(74,144,144,0.4);
        }

        /* Submit */
        .submit-btn {
          width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.93rem;
          font-weight: 500; border: none; border-radius: 6px; padding: 13px;
          cursor: pointer; letter-spacing: 0.03em; margin-top: 6px;
          transition: transform 0.15s, opacity 0.2s;
          position: relative; overflow: hidden; color: white;
        }
        .submit-btn.student { background: var(--ink); }
        .submit-btn.teacher { background: #1e3535; }
        .submit-btn::before {
          content: ''; position: absolute; inset: 0;
          transform: translateX(-101%); transition: transform 0.3s ease;
        }
        .submit-btn.student::before { background: var(--rose); }
        .submit-btn.teacher::before { background: var(--teal); }
        .submit-btn:hover::before { transform: translateX(0); }
        .submit-btn:hover { transform: translateY(-1px); }
        .submit-btn span { position: relative; z-index: 1; }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* Footer */
        .form-divider { border: none; border-top: 1px solid var(--mist); margin: 22px 0 16px; }
        .level-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 0.74rem;
          color: #a89888; letter-spacing: 0.06em;
        }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; transition: background 0.3s; }
        .badge-dot.student { background: var(--rose-light); }
        .badge-dot.teacher { background: rgba(74,144,144,0.6); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          margin-right: 7px; vertical-align: middle;
        }
      `}</style>

      <div className="login-page">
        {/* Left panel */}
        <div className={`login-panel ${role}`}>
          <div className={`panel-bg ${role}`} />
          <div className="panel-kanji">日本語</div>
          <div className="panel-content">
            <span className="panel-kana">
              {role === "teacher" ? "せんせい" : "がくせい"}
            </span>
            <div className={`panel-divider ${role}`} />
            <p className={`panel-role-label ${role}`}>
              {role === "teacher" ? "Teacher Portal" : "Student Portal"}
            </p>
          </div>
        </div>

        {/* Right form */}
        <div className="login-form-side">
          <button className="back-link" onClick={() => navigate("/")}>← Back to home</button>

          {/* Login / Register tabs */}
          <div className="mode-tabs">
            <button className={`mode-tab ${isLogin ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}>
              ログイン · Sign In
            </button>
            <button className={`mode-tab ${!isLogin ? "active" : ""}`} onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}>
              登録 · Register
            </button>
          </div>

          {/* Role toggle — always visible, affects panel + register role */}
          <div className="role-toggle">
            <div className={`role-pill ${role}`} />
            <button type="button" className={`role-btn ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>🎓 Student</button>
            <button type="button" className={`role-btn ${role === "teacher" ? "active" : ""}`} onClick={() => setRole("teacher")}>📋 Teacher</button>
          </div>

          {/* Header */}
          <div className="form-header">
            <span className={`form-greeting ${role}`}>
              {role === "teacher" ? "こんにちは、せんせい" : "こんにちは、がくせい"}
            </span>
            <h1 className="form-title">
              {isLogin
                ? (role === "teacher" ? "Welcome back, Sensei" : "Sign in to continue")
                : (role === "teacher" ? "Create teacher account" : "Start your journey")}
            </h1>
            <p className="form-sub">
              {isLogin
                ? "Enter your credentials to access your dashboard."
                : "Fill in your details to create a free account."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={role === "teacher" ? "teacher" : ""}
                />
              </div>
            )}

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={role === "teacher" ? "teacher" : ""}
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={role === "teacher" ? "teacher" : ""}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}
            {successMsg && <div className="success-msg">{successMsg}</div>}

            <button className={`submit-btn ${role}`} type="submit" disabled={loading}>
              <span>
                {loading && <span className="spinner" />}
                {loading ? "Please wait…"
                  : isLogin
                    ? (role === "teacher" ? "ログイン — Enter Teacher Portal" : "ログイン — Start Learning")
                    : "アカウント作成 — Create Account"}
              </span>
            </button>
          </form>

          <hr className="form-divider" />
          <div className="level-badge">
            <span className={`badge-dot ${role}`} />
            {role === "teacher" ? "JFS A0–A2 Classroom Management" : "JFS A0 · A1 · A2 Learner Portal"}
          </div>
        </div>
      </div>
    </>
  );
}