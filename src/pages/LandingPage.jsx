import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const petals = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 8}s`,
  duration: `${6 + Math.random() * 6}s`,
  size: `${10 + Math.random() * 14}px`,
  rotation: `${Math.random() * 360}deg`,
}));

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { getProfileRole } = useAuth();

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    setTimeout(() => el.classList.add("visible"), 50);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=Shippori+Mincho:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cream: #fdf6ee;
          --ink: #1a1210;
          --charcoal: #2e2622;
          --rose: #d4697a;
          --rose-light: #f2b8c0;
          --gold: #c09050;
          --mist: #e8ddd4;
          --paper: #faf2e8;
        }

        body { background: var(--cream); }

        .landing {
          min-height: 100vh;
          background: var(--cream);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Subtle paper texture via gradient */
        .landing::before {
          content: '';
          position: fixed;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 0%, rgba(212,105,122,0.07) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 100%, rgba(192,144,80,0.06) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* Vertical Japanese rule line */
        .rule-line {
          position: fixed;
          top: 0;
          left: 50%;
          width: 1px;
          height: 100vh;
          background: linear-gradient(to bottom, transparent, rgba(212,105,122,0.15), transparent);
          pointer-events: none;
          z-index: 0;
        }

        /* Falling petals */
        @keyframes petalFall {
          0%   { transform: translateY(-60px) rotate(0deg) translateX(0); opacity: 0; }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(110vh) rotate(720deg) translateX(40px); opacity: 0; }
        }

        .petal {
          position: fixed;
          top: -20px;
          pointer-events: none;
          z-index: 1;
          animation: petalFall linear infinite;
        }

        .petal svg { opacity: 0.55; }

        /* Nav */
        .nav {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 48px;
          border-bottom: 1px solid rgba(212,105,122,0.12);
        }

        .nav-logo {
          font-family: 'Noto Serif JP', serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--rose);
        }

        .nav-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          color: var(--gold);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        /* Hero */
        .hero {
          position: relative;
          z-index: 5;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 32px 60px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }

        .hero.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-kana {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(3.5rem, 10vw, 6.5rem);
          font-weight: 300;
          color: var(--ink);
          letter-spacing: 0.25em;
          line-height: 1;
          margin-bottom: 12px;
          position: relative;
        }

        .hero-kana::after {
          content: '';
          display: block;
          width: 48px;
          height: 2px;
          background: var(--rose);
          margin: 20px auto 0;
          border-radius: 2px;
        }

        .hero-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 600;
          color: var(--charcoal);
          letter-spacing: 0.01em;
          margin-top: 20px;
          margin-bottom: 16px;
        }

        .hero-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 1rem;
          color: #7a6a60;
          font-weight: 300;
          max-width: 400px;
          line-height: 1.7;
          margin-bottom: 12px;
        }

        .hero-level {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(212,105,122,0.08);
          border: 1px solid rgba(212,105,122,0.2);
          border-radius: 100px;
          padding: 5px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          color: var(--rose);
          letter-spacing: 0.08em;
          margin-bottom: 44px;
        }

        .level-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--rose-light);
        }

        /* Buttons */
        .btn-group {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-primary {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          background: var(--ink);
          color: var(--cream);
          border: none;
          border-radius: 6px;
          padding: 14px 36px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: background 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--rose);
          transform: translateX(-101%);
          transition: transform 0.3s ease;
        }

        .btn-primary:hover::before { transform: translateX(0); }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary span { position: relative; z-index: 1; }

        .btn-secondary {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 400;
          background: transparent;
          color: var(--charcoal);
          border: 1.5px solid rgba(46,38,34,0.25);
          border-radius: 6px;
          padding: 14px 36px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: border-color 0.2s, color 0.2s, transform 0.15s;
        }

        .btn-secondary:hover {
          border-color: var(--rose);
          color: var(--rose);
          transform: translateY(-1px);
        }

        /* Feature strips */
        .features {
          position: relative;
          z-index: 5;
          display: flex;
          justify-content: center;
          gap: 0;
          padding: 0 48px 64px;
          flex-wrap: wrap;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 20px 32px;
          border-right: 1px solid rgba(212,105,122,0.15);
        }

        .feature:last-child { border-right: none; }

        .feature-icon {
          font-family: 'Noto Serif JP', serif;
          font-size: 1.4rem;
          color: var(--rose);
        }

        .feature-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          color: #9a8880;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Footer mark */
        .footer-mark {
          position: relative;
          z-index: 5;
          text-align: center;
          padding: 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          color: #c0b0a8;
          letter-spacing: 0.1em;
        }

        @media (max-width: 600px) {
          .nav { padding: 20px 24px; }
          .feature { padding: 14px 18px; }
          .btn-group { flex-direction: column; align-items: center; }
          .btn-primary, .btn-secondary { width: 220px; }
        }
      `}</style>

      <div className="landing">
        <div className="rule-line" />

        {/* Falling petals */}
        {petals.map(p => (
          <div
            key={p.id}
            className="petal"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: p.size,
              height: p.size,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <path
                d="M12 2 C14 6, 20 8, 18 14 C16 20, 8 20, 6 14 C4 8, 10 6, 12 2Z"
                fill="rgba(212,105,122,0.6)"
                style={{ transform: `rotate(${p.rotation})`, transformOrigin: 'center' }}
              />
            </svg>
          </div>
        ))}

        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-dot" />
            にほんご
          </div>
          <span className="nav-label">JFS A0–A2</span>
        </nav>

        {/* Hero */}
        <section className="hero" ref={heroRef}>
          <div className="hero-kana">にほんご</div>
          <h1 className="hero-title">Learn Japanese, Step by Step</h1>
          <p className="hero-sub">
            A gentle space for beginners to practice greetings, shopping,
            and everyday conversation — one hiragana at a time.
          </p>
          <div className="hero-level">
            <span className="level-dot" />
            Designed for JFS A0 · A1 · A2 learners
          </div>
          <div className="btn-group">
            <button className="btn-primary" onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const userRole = await getProfileRole(session.user.id);
                navigate(`/dashboard/${userRole}`);
              } else {
                navigate("/login");
              }
            }}>
              <span>はじめましょう — Start Learning</span>
            </button>
          </div>
        </section>

        {/* Features */}
        <div className="features">
          {[
            { icon: "あ", label: "Hiragana Focus" },
            { icon: "💬", label: "Conversation Practice" },
            { icon: "🛒", label: "Lesson Modes" },
            { icon: "🎓", label: "Classroom Ready" },
          ].map(f => (
            <div className="feature" key={f.label}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-label">{f.label}</div>
            </div>
          ))}
        </div>

        <div className="footer-mark">© 2025 にほんごBot — Built for learners</div>
      </div>
    </>
  );
}