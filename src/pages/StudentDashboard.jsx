import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const lessons = [
  { emoji: "👋", label: "Greetings", kana: "あいさつ", color: "#d4697a" },
  { emoji: "🙋", label: "Self Introduction", kana: "じこしょうかい", color: "#c09050" },
  { emoji: "🛒", label: "Shopping", kana: "かいもの", color: "#4a9090" },
  { emoji: "🍱", label: "Ordering Food", kana: "たべもの", color: "#7a7abf" },
  { emoji: "🗺️", label: "Directions", kana: "みちあんない", color: "#8a9a50" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile?.full_name || profile?.email || "Learner";
  const level = profile?.level || "A0";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=Shippori+Mincho:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #fdf6ee; --ink: #1a1210; --charcoal: #2e2622;
          --rose: #d4697a; --rose-light: #f2b8c0; --mist: #e8ddd4; --paper: #faf2e8;
        }
        body { background: var(--cream); }

        .page {
          min-height: 100vh;
          background: var(--cream);
          display: flex;
          flex-direction: column;
        }

        /* Nav */
        .nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 48px;
          border-bottom: 1px solid rgba(212,105,122,0.12);
        }
        .nav-logo {
          font-family: 'Noto Serif JP', serif; font-size: 1rem;
          font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 10px;
        }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rose); }
        .nav-right { display: flex; align-items: center; gap: 20px; }
        .nav-user {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #9a8880;
          display: flex; align-items: center; gap: 6px;
        }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(212,105,122,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem;
        }
        .logout-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
          color: #b0a098; background: none; border: 1px solid var(--mist);
          border-radius: 5px; padding: 6px 14px; cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .logout-btn:hover { color: var(--rose); border-color: rgba(212,105,122,0.3); }

        /* Body */
        .content { flex: 1; padding: 52px 48px; max-width: 860px; margin: 0 auto; width: 100%; }

        .welcome-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.95rem;
          color: var(--rose); letter-spacing: 0.18em; display: block; margin-bottom: 6px;
        }
        .welcome-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 600;
          color: var(--ink); margin-bottom: 8px;
        }
        .welcome-sub {
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
          color: #9a8880; font-weight: 300; margin-bottom: 44px;
        }

        /* Level badge */
        .level-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 44px;
        }
        .level-chip {
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem;
          padding: 4px 14px; border-radius: 100px; letter-spacing: 0.08em;
          border: 1.5px solid; cursor: default;
        }
        .level-chip.active {
          background: rgba(212,105,122,0.1); border-color: var(--rose); color: var(--rose);
        }
        .level-chip.inactive {
          background: transparent; border-color: var(--mist); color: #c0b0a8;
        }

        /* Lesson section */
        .section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.73rem;
          text-transform: uppercase; letter-spacing: 0.14em; color: #b0a098;
          margin-bottom: 16px;
        }

        .lesson-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 44px;
        }

        .lesson-card {
          background: var(--paper);
          border: 1.5px solid var(--mist);
          border-radius: 10px;
          padding: 22px 20px;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
          display: flex; flex-direction: column; gap: 8px;
        }
        .lesson-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.07);
        }
        .lesson-emoji { font-size: 1.5rem; }
        .lesson-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.78rem;
          letter-spacing: 0.1em;
        }
        .lesson-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          font-weight: 500; color: var(--charcoal);
        }
        .lesson-arrow {
          font-size: 0.75rem; color: #c0b0a8; margin-top: 4px;
          transition: color 0.2s, transform 0.2s;
        }
        .lesson-card:hover .lesson-arrow { color: inherit; transform: translateX(3px); }

        /* Chat CTA */
        .chat-cta {
          background: var(--ink);
          border-radius: 10px;
          padding: 28px 32px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px; flex-wrap: wrap;
        }
        .cta-left {}
        .cta-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.85rem;
          color: rgba(255,255,255,0.4); letter-spacing: 0.15em; display: block; margin-bottom: 4px;
        }
        .cta-title {
          font-family: 'Shippori Mincho', serif; font-size: 1.15rem;
          color: white; font-weight: 600;
        }
        .cta-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
          font-weight: 500; background: var(--rose); color: white;
          border: none; border-radius: 6px; padding: 12px 26px;
          cursor: pointer; letter-spacing: 0.03em; white-space: nowrap;
          transition: opacity 0.2s, transform 0.15s;
        }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }

        @media (max-width: 600px) {
          .nav { padding: 18px 24px; }
          .content { padding: 36px 24px; }
        }
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-dot" />
            にほんご
          </div>
          <div className="nav-right">
            <div className="nav-user">
              <div className="user-avatar">🎓</div>
              {displayName}
            </div>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </nav>

        <div className="content">
          <span className="welcome-kana">おかえり！</span>
          <h1 className="welcome-title">Welcome back, learner.</h1>
          <p className="welcome-sub">Pick a lesson or jump straight into free conversation.</p>

          {/* Level chips */}
          <div className="level-row">
            {["A0", "A1", "A2"].map((l) => (
              <div key={l} className={`level-chip ${l === level ? "active" : "inactive"}`}>{l}</div>
            ))}
          </div>

          {/* Lessons */}
          <div className="section-label">Choose a lesson mode</div>
          <div className="lesson-grid">
            {lessons.map(l => (
              <div
                key={l.label}
                className="lesson-card"
                style={{ "--accent": l.color }}
                onMouseEnter={e => e.currentTarget.style.borderColor = l.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = ""}
              >
                <div className="lesson-emoji">{l.emoji}</div>
                <div className="lesson-kana" style={{ color: l.color }}>{l.kana}</div>
                <div className="lesson-label">{l.label}</div>
                <div className="lesson-arrow" style={{ color: l.color }}>Start →</div>
              </div>
            ))}
          </div>

          {/* Free chat CTA */}
          <div className="chat-cta">
            <div className="cta-left">
              <span className="cta-kana">じゆうかいわ</span>
              <div className="cta-title">Free Conversation Practice</div>
            </div>
            <button className="cta-btn" onClick={() => alert("Chat UI coming in Phase 2!")}>
              💬 Start Chatting
            </button>
          </div>
        </div>
      </div>
    </>
  );
}