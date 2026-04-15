import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const lessonStats = [
  { label: "Greetings", kana: "あいさつ", count: 18 },
  { label: "Shopping", kana: "かいもの", count: 11 },
  { label: "Self Intro", kana: "じこしょうかい", count: 14 },
  { label: "Food", kana: "たべもの", count: 7 },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile?.full_name || profile?.email || "Sensei";

  useEffect(() => {
    if (!profile?.id) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);

      // Join teacher_students with profiles to get student details
      const { data, error } = await supabase
        .from("teacher_students")
        .select(`
          assigned_at,
          student:student_id (
            id,
            full_name,
            email,
            level
          )
        `)
        .eq("teacher_id", profile.id)
        .order("assigned_at", { ascending: false });
        console.log(data);

      if (!error && data) {
        setStudents(data.map(row => ({
          ...row.student,
          assigned_at: row.assigned_at,
        })));
      }

      setLoadingStudents(false);
    };

    fetchStudents();
  }, [profile?.id]);

  // Compute level counts for stats
  const levelCounts = students.reduce((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + 1;
    return acc;
  }, {});

  const levelRange = students.length === 0 ? "—"
    : Object.keys(levelCounts).sort().join(", ");

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }

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
          padding: 20px 48px; background: var(--charcoal);
        }
        .nav-logo {
          font-family: 'Noto Serif JP', serif; font-size: 1rem;
          color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 10px;
        }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-user {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
          color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 7px;
        }
        .user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(74,144,144,0.25);
          display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
        }
        .nav-action-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
          color: white; background: var(--teal);
          border: none; border-radius: 5px; padding: 7px 16px;
          cursor: pointer; transition: opacity 0.2s;
        }
        .nav-action-btn:hover { opacity: 0.85; }
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

        /* Stats */
        .stats-row {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 14px; margin-bottom: 40px;
        }
        .stat-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 20px 18px; }
        .stat-value { font-family: 'Shippori Mincho', serif; font-size: 2rem; font-weight: 600; color: var(--ink); display: block; }
        .stat-label { font-family: 'DM Sans', sans-serif; font-size: 0.76rem; color: #6a9090; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
        .stat-accent { color: var(--teal); }

        /* Two col */
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
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .student-meta { font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: #8ab0b0; margin-top: 2px; }
        .level-badge {
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem; padding: 2px 9px;
          border-radius: 100px; border: 1px solid var(--teal-light);
          color: var(--teal); background: rgba(74,144,144,0.07); flex-shrink: 0;
        }

        /* Empty state */
        .empty-state {
          background: white; border: 1.5px dashed var(--mist); border-radius: 10px;
          padding: 40px 24px; text-align: center;
        }
        .empty-icon { font-size: 2rem; margin-bottom: 10px; }
        .empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #8ab0b0; margin-bottom: 14px; }
        .empty-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
          background: var(--charcoal); color: white; border: none; border-radius: 6px;
          padding: 10px 22px; cursor: pointer; transition: opacity 0.2s;
        }
        .empty-btn:hover { opacity: 0.85; }

        /* Loading */
        .loading-row {
          background: white; border: 1.5px solid var(--mist); border-radius: 8px;
          padding: 14px 18px; display: flex; gap: 12px; align-items: center;
        }
        @keyframes shimmer { 0% { opacity: 0.4; } 50% { opacity: 0.8; } 100% { opacity: 0.4; } }
        .shimmer { background: var(--mist); border-radius: 4px; animation: shimmer 1.2s ease infinite; }

        /* Lesson stats */
        .lesson-stat-list { display: flex; flex-direction: column; gap: 10px; }
        .lesson-stat-row {
          background: white; border: 1.5px solid var(--mist); border-radius: 8px;
          padding: 14px 18px; display: flex; align-items: center; gap: 12px;
        }
        .ls-kana { font-family: 'Noto Serif JP', serif; font-size: 0.85rem; color: var(--teal); width: 90px; flex-shrink: 0; }
        .ls-label { font-family: 'DM Sans', sans-serif; font-size: 0.87rem; color: var(--charcoal); flex: 1; }
        .ls-count { font-family: 'Shippori Mincho', serif; font-size: 1.1rem; color: var(--ink); font-weight: 600; }
        .ls-unit { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #8ab0b0; margin-left: 3px; }

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
            <button className="nav-action-btn" onClick={() => navigate("/dashboard/teacher/register")}>
              + Register Students
            </button>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </nav>

        <div className="content">
          <span className="welcome-kana">おはようございます、せんせい</span>
          <h1 className="welcome-title">Teacher Dashboard</h1>
          <p className="welcome-sub">Here's how your class is doing.</p>

          {/* Stats */}
          <div className="stats-row">
            {[
              { value: loadingStudents ? "…" : String(students.length), label: "Students", accent: false },
              { value: loadingStudents ? "…" : String(Object.keys(levelCounts).length), label: "Levels Active", accent: true },
              { value: loadingStudents ? "…" : levelRange, label: "Level Range", accent: false },
              { value: "—", label: "Sessions Total", accent: false },
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
              <div className="section-label">
                {loadingStudents ? "Loading students…" : `${students.length} Student${students.length !== 1 ? "s" : ""} Assigned`}
              </div>

              {loadingStudents ? (
                <div className="student-list">
                  {[1,2,3].map(i => (
                    <div className="loading-row" key={i}>
                      <div className="shimmer" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="shimmer" style={{ height: 12, width: "60%" }} />
                        <div className="shimmer" style={{ height: 10, width: "40%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎓</div>
                  <div className="empty-text">No students registered yet.</div>
                  <button className="empty-btn" onClick={() => navigate("/dashboard/teacher/register")}>
                    Register Students
                  </button>
                </div>
              ) : (
                <div className="student-list">
                  {students.map(s => (
                    <div className="student-row" key={s.id}>
                      <div className="student-avatar">🎓</div>
                      <div className="student-info">
                        <div className="student-name">{s.full_name || s.email}</div>
                        <div className="student-meta">{s.email}</div>
                      </div>
                      <span className="level-badge">{s.level || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lesson usage — placeholder until chat is built */}
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