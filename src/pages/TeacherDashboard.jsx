import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const students = [
  { name: "Aisha Binti Rahman", level: "A1", progress: 72, lastActive: "Today" },
  { name: "Wei Jian Lim", level: "A0", progress: 35, lastActive: "Yesterday" },
  { name: "Priya Nair", level: "A2", progress: 91, lastActive: "Today" },
  { name: "Hafiz Mohd Zain", level: "A1", progress: 58, lastActive: "2 days ago" },
  { name: "Mei Lin Tan", level: "A0", progress: 20, lastActive: "Today" },
];

const lessonStats = [
  { label: "Greetings", kana: "あいさつ", count: 18 },
  { label: "Shopping", kana: "かいもの", count: 11 },
  { label: "Self Intro", kana: "じこしょうかい", count: 14 },
  { label: "Food", kana: "たべもの", count: 7 },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile?.full_name || profile?.email || "Sensei";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=Shippori+Mincho:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #f4f9f9; --ink: #0e1f1f; --teal: #4a9090; --teal-light: #a0c8c8;
          --mist: #d8eaea; --paper: #eef6f6; --gold: #c09050; --charcoal: #1e3535;
        }
        body { background: var(--bg); }

        .page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }

        /* Nav */
        .nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 48px;
          background: var(--charcoal);
        }
        .nav-logo {
          font-family: 'Noto Serif JP', serif; font-size: 1rem;
          color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 10px;
        }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-user {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          display: flex; align-items: center; gap: 7px;
        }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(74,144,144,0.25);
          display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
        }
        .logout-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
          color: rgba(255,255,255,0.45); background: none;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 5px; padding: 6px 14px; cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .logout-btn:hover { color: var(--teal-light); border-color: rgba(74,144,144,0.4); }

        /* Content */
        .content { flex: 1; padding: 48px; max-width: 960px; margin: 0 auto; width: 100%; }

        .welcome-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.9rem;
          color: var(--teal); letter-spacing: 0.18em; display: block; margin-bottom: 5px;
        }
        .welcome-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 600;
          color: var(--ink); margin-bottom: 6px;
        }
        .welcome-sub {
          font-family: 'DM Sans', sans-serif; font-size: 0.87rem;
          color: #6a9090; font-weight: 300; margin-bottom: 40px;
        }

        /* Stats row */
        .stats-row {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 14px; margin-bottom: 40px;
        }
        .stat-card {
          background: white; border: 1.5px solid var(--mist);
          border-radius: 10px; padding: 20px 18px;
        }
        .stat-value {
          font-family: 'Shippori Mincho', serif;
          font-size: 2rem; font-weight: 600; color: var(--ink); display: block;
        }
        .stat-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.76rem;
          color: #6a9090; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px;
        }
        .stat-accent { color: var(--teal); }

        /* Two-column layout */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

        .section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 0.14em; color: #8ab0b0; margin-bottom: 14px;
        }

        /* Student list */
        .student-list { display: flex; flex-direction: column; gap: 10px; }
        .student-row {
          background: white; border: 1.5px solid var(--mist);
          border-radius: 8px; padding: 14px 18px;
          display: flex; align-items: center; gap: 14px;
        }
        .student-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--paper); border: 1.5px solid var(--mist);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; flex-shrink: 0;
        }
        .student-info { flex: 1; min-width: 0; }
        .student-name {
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
          font-weight: 500; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .student-meta {
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem;
          color: #8ab0b0; margin-top: 2px;
        }
        .progress-bar-wrap {
          width: 80px; flex-shrink: 0;
        }
        .progress-bar-bg {
          height: 5px; background: var(--mist); border-radius: 3px; overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%; background: var(--teal); border-radius: 3px;
          transition: width 0.6s ease;
        }
        .progress-pct {
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
          color: #8ab0b0; text-align: right; margin-top: 3px;
        }
        .level-badge {
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem;
          padding: 2px 9px; border-radius: 100px;
          border: 1px solid var(--teal-light); color: var(--teal);
          background: rgba(74,144,144,0.07); flex-shrink: 0;
        }

        /* Lesson stats */
        .lesson-stat-list { display: flex; flex-direction: column; gap: 10px; }
        .lesson-stat-row {
          background: white; border: 1.5px solid var(--mist);
          border-radius: 8px; padding: 14px 18px;
          display: flex; align-items: center; gap: 12px;
        }
        .ls-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.85rem;
          color: var(--teal); width: 90px; flex-shrink: 0;
        }
        .ls-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.87rem;
          color: var(--charcoal); flex: 1;
        }
        .ls-count {
          font-family: 'Shippori Mincho', serif; font-size: 1.1rem;
          color: var(--ink); font-weight: 600;
        }
        .ls-unit {
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
          color: #8ab0b0; margin-left: 3px;
        }

        @media (max-width: 600px) {
          .nav { padding: 18px 24px; }
          .content { padding: 32px 24px; }
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
              <div className="user-avatar">📋</div>
              {displayName}
            </div>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </nav>

        <div className="content">
          <span className="welcome-kana">おはようございます、せんせい</span>
          <h1 className="welcome-title">Teacher Dashboard</h1>
          <p className="welcome-sub">Here's how your class is doing today.</p>

          <button onClick={() => navigate("/dashboard/teacher/register")}>
            + Register Students
          </button>

          {/* Stats */}
          <div className="stats-row">
            {[
              { value: "5", label: "Students", accent: false },
              { value: "3", label: "Active Today", accent: true },
              { value: "A0–A2", label: "Level Range", accent: false },
              { value: "50", label: "Sessions Total", accent: false },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <span className={`stat-value ${s.accent ? "stat-accent" : ""}`}>{s.value}</span>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="two-col">
            {/* Student list */}
            <div>
              <div className="section-label">Student Progress</div>
              <div className="student-list">
                {students.map(s => (
                  <div className="student-row" key={s.name}>
                    <div className="student-avatar">🎓</div>
                    <div className="student-info">
                      <div className="student-name">{s.name}</div>
                      <div className="student-meta">Last active: {s.lastActive}</div>
                    </div>
                    <span className="level-badge">{s.level}</span>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${s.progress}%` }} />
                      </div>
                      <div className="progress-pct">{s.progress}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lesson usage */}
            <div>
              <div className="section-label">Lesson Usage This Week</div>
              <div className="lesson-stat-list">
                {lessonStats.map(l => (
                  <div className="lesson-stat-row" key={l.label}>
                    <div className="ls-kana">{l.kana}</div>
                    <div className="ls-label">{l.label}</div>
                    <div>
                      <span className="ls-count">{l.count}</span>
                      <span className="ls-unit">sessions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}