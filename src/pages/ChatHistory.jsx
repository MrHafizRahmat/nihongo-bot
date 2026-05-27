import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { parseResponse } from "../lib/japaneseUtils";

const LESSON_META = {
  greeting:   { emoji: "👋", label: "Greetings",        kana: "あいさつ",       color: "#d4697a" },
  self_intro: { emoji: "🙋", label: "Self Introduction", kana: "じこしょうかい", color: "#4a7ab0" },
  shopping:   { emoji: "🛒", label: "Shopping",          kana: "かいもの",       color: "#4a9090" },
  food:       { emoji: "🍱", label: "Ordering Food",     kana: "たべもの",       color: "#c09050" },
  directions: { emoji: "🗺️", label: "Directions",       kana: "みちあんない",   color: "#7a7abf" },
};

const CHARACTER_NAME = {
  greeting:   "やまだ ゆい",
  self_intro: "たなか けんじ",
  shopping:   "すずき はな",
  food:       "さとう りょう",
  directions: "きむら あおい",
};

// Read-only bubble for replaying messages
function ReplayBubble({ msg }) {
  const [expanded, setExpanded] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="replay-row user">
        <div className="replay-avatar user">🎓</div>
        <div className="replay-bubble user">{msg.content}</div>
      </div>
    );
  }

  const parsed = parseResponse(msg.content);
  const hasExtra = parsed.romaji || parsed.note;

  return (
    <div className="replay-row assistant">
      <div className="replay-avatar assistant">ゆ</div>
      <div className="replay-bubble assistant">
        {parsed.japanese && <div className="rb-japanese">{parsed.japanese}</div>}
        {hasExtra && (
          <button className={`rb-toggle ${expanded ? "open" : ""}`} onClick={() => setExpanded(p => !p)}>
            <span>{expanded ? "▲" : "▼"}</span>
            {expanded ? "Hide" : "Show romaji & notes"}
          </button>
        )}
        {expanded && (
          <div className="rb-extra">
            {parsed.romaji && <div className="rb-romaji">{parsed.romaji}</div>}
            {parsed.romaji && parsed.note && <div className="rb-divider" />}
            {parsed.note   && <div className="rb-note">{parsed.note}</div>}
          </div>
        )}
        {!parsed.japanese && !parsed.romaji && parsed.note && (
          <div className="rb-note">{parsed.note}</div>
        )}
      </div>
    </div>
  );
}

// Single session card in the list
function SessionCard({ session, onOpen }) {
  const meta = LESSON_META[session.lesson_mode] || LESSON_META.greeting;
  const char = CHARACTER_NAME[session.lesson_mode] || "—";

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-MY", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="session-card" onClick={() => onOpen(session)}>
      <div className="session-card-left">
        <div className="session-emoji" style={{ background: `${meta.color}18`, color: meta.color }}>
          {meta.emoji}
        </div>
      </div>
      <div className="session-card-info">
        <div className="session-label">{meta.label}
          <span className="session-kana"> · {meta.kana}</span>
        </div>
        <div className="session-char">with {char}</div>
        <div className="session-date">{formatDate(session.updated_at || session.created_at)}</div>
      </div>
      <div className="session-card-right">
        <span className="session-msg-count">{session.message_count ?? ""}</span>
        <span className="session-arrow" style={{ color: meta.color }}>→</span>
      </div>
    </div>
  );
}

export default function ChatHistory() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeSession, setActive]  = useState(null);
  const [messages, setMessages]     = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [filter, setFilter]         = useState("all");

  const displayName = profile?.full_name || "Student";

  useEffect(() => {
    if (profile?.id) fetchSessions();
  }, [profile?.id]);

  async function fetchSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*, chat_messages(count)")
      .eq("student_id", profile.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setSessions(data.map(s => ({
        ...s,
        message_count: s.chat_messages?.[0]?.count ?? 0,
      })));
    }
    setLoading(false);
  }

  async function openSession(session) {
    setActive(session);
    setMsgLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setMsgLoading(false);
  }

  const filtered = filter === "all"
    ? sessions
    : sessions.filter(s => s.lesson_mode === filter);

  const meta = activeSession ? (LESSON_META[activeSession.lesson_mode] || LESSON_META.greeting) : null;
  const char = activeSession ? (CHARACTER_NAME[activeSession.lesson_mode] || "—") : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&family=Shippori+Mincho:wght@600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #fdf6ee; --ink: #1a1210; --charcoal: #2e2622;
          --rose: #d4697a; --rose-light: #f2b8c0; --mist: #e8ddd4; --paper: #faf2e8;
        }
        body { background: var(--cream); }
        .page { min-height: 100vh; background: var(--cream); display: flex; flex-direction: column; }

        /* Nav */
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 18px 40px; border-bottom: 1px solid rgba(212,105,122,0.12); flex-shrink: 0; }
        .nav-logo { font-family: 'Noto Serif JP', serif; font-size: 0.95rem; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; }
        .nav-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-user { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #9a8880; }
        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 12px; cursor: pointer; color: #b0a098; transition: color 0.2s; }
        .nav-btn:hover { color: var(--rose); }

        /* Layout */
        .layout { flex: 1; display: grid; grid-template-columns: 380px 1fr; max-width: 1100px; margin: 0 auto; width: 100%; padding: 0; }
        @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } .session-viewer { display: none; } .layout.viewing .session-list { display: none; } .layout.viewing .session-viewer { display: flex; } }

        /* Session list */
        .session-list { border-right: 1px solid var(--mist); display: flex; flex-direction: column; }
        .list-header { padding: 24px 24px 16px; border-bottom: 1px solid var(--mist); }
        .list-kana { font-family: 'Noto Serif JP', serif; font-size: 0.8rem; color: var(--rose); letter-spacing: 0.15em; display: block; margin-bottom: 4px; }
        .list-title { font-family: 'Shippori Mincho', serif; font-size: 1.15rem; font-weight: 600; color: var(--ink); margin-bottom: 14px; }

        /* Filter chips */
        .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
        .filter-chip { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; padding: 4px 10px; border-radius: 100px; border: 1.5px solid var(--mist); background: white; cursor: pointer; color: #9a8880; transition: all 0.2s; }
        .filter-chip.active { background: var(--ink); border-color: var(--ink); color: white; }

        .list-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }

        /* Session card */
        .session-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
        .session-card:hover { border-color: rgba(212,105,122,0.3); box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .session-card.active { border-color: var(--rose-light); background: rgba(212,105,122,0.03); }
        .session-emoji { width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
        .session-card-info { flex: 1; min-width: 0; }
        .session-label { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; color: var(--ink); }
        .session-kana { font-family: 'Noto Serif JP', serif; font-size: 0.72rem; color: #9a8880; font-weight: 400; }
        .session-char { font-family: 'DM Sans', sans-serif; font-size: 0.74rem; color: #9a8880; margin-top: 2px; }
        .session-date { font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #c0b0a8; margin-top: 2px; }
        .session-card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .session-msg-count { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #c0b0a8; }
        .session-arrow { font-size: 0.85rem; }

        /* Empty / loading */
        .list-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 48px 24px; text-align: center; }
        .list-empty-icon { font-size: 2rem; }
        .list-empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #b0a098; line-height: 1.6; }
        .list-empty-btn { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; background: var(--ink); color: white; border: none; border-radius: 6px; padding: 9px 20px; cursor: pointer; margin-top: 4px; transition: background 0.2s; }
        .list-empty-btn:hover { background: var(--rose); }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .shimmer { background: var(--mist); border-radius: 4px; animation: shimmer 1.2s ease infinite; }
        .shimmer-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px; align-items: center; }

        /* Session viewer */
        .session-viewer { display: flex; flex-direction: column; height: calc(100vh - 61px); }
        .viewer-header { padding: 20px 28px 16px; border-bottom: 1px solid var(--mist); display: flex; align-items: center; gap: 14px; flex-shrink: 0; background: var(--paper); }
        .viewer-char-dot { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif JP', serif; font-size: 1rem; border: 2px solid; flex-shrink: 0; }
        .viewer-info { flex: 1; }
        .viewer-title { font-family: 'Shippori Mincho', serif; font-size: 1rem; font-weight: 600; color: var(--ink); }
        .viewer-sub { font-family: 'DM Sans', sans-serif; font-size: 0.74rem; color: #9a8880; margin-top: 2px; }
        .viewer-close { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 12px; cursor: pointer; color: #b0a098; transition: color 0.2s; }
        .viewer-close:hover { color: var(--rose); }

        .viewer-body { flex: 1; overflow-y: auto; padding: 20px 28px; display: flex; flex-direction: column; gap: 14px; }

        /* Replay messages */
        .replay-row { display: flex; gap: 8px; max-width: 80%; }
        .replay-row.user { align-self: flex-end; flex-direction: row-reverse; }
        .replay-row.assistant { align-self: flex-start; }
        .replay-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; margin-top: 2px; font-family: 'Noto Serif JP', serif; }
        .replay-avatar.user { background: rgba(46,38,34,0.08); font-size: 0.85rem; }
        .replay-avatar.assistant { border: 1.5px solid; }
        .replay-bubble { padding: 10px 14px; border-radius: 14px; word-break: break-word; }
        .replay-bubble.user { background: var(--ink); color: white; font-family: 'DM Sans', sans-serif; font-size: 0.86rem; line-height: 1.6; border-bottom-right-radius: 3px; }
        .replay-bubble.assistant { background: white; border: 1.5px solid var(--mist); border-bottom-left-radius: 3px; display: flex; flex-direction: column; }
        .rb-japanese { font-family: 'Noto Serif JP', serif; font-size: 1.05rem; color: var(--ink); line-height: 1.6; padding-bottom: 2px; }
        .rb-romaji { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: var(--rose); padding-bottom: 8px; }
        .rb-divider { border: none; border-top: 1px solid var(--mist); margin-bottom: 8px; }
        .rb-note { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #5a4a44; line-height: 1.6; }
        .rb-toggle { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-family: 'DM Sans', sans-serif; font-size: 0.68rem; font-weight: 500; color: #b0a098; background: none; border: 1px solid var(--mist); border-radius: 100px; padding: 2px 8px; cursor: pointer; transition: color 0.2s, border-color 0.2s; width: fit-content; }
        .rb-toggle:hover, .rb-toggle.open { color: var(--rose); border-color: var(--rose-light); }
        .rb-extra { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--mist); }

        /* Viewer empty */
        .viewer-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #c0b0a8; }
        .viewer-empty-icon { font-size: 2.5rem; }
        .viewer-empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; }

        @media (max-width: 600px) {
          .nav { padding: 16px 20px; }
        }
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">🎓 {displayName}</span>
            <button className="nav-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        <div className={`layout ${activeSession ? "viewing" : ""}`}>
          {/* Session list */}
          <div className="session-list">
            <div className="list-header">
              <span className="list-kana">かいわのきろく</span>
              <div className="list-title">Chat History</div>
              <div className="filter-bar">
                {[{ id: "all", label: "All" }, ...Object.entries(LESSON_META).map(([id, m]) => ({ id, label: m.emoji + " " + m.label }))].map(f => (
                  <button key={f.id} className={`filter-chip ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="list-body">
              {loading ? (
                [1,2,3,4].map(i => (
                  <div className="shimmer-card" key={i}>
                    <div className="shimmer" style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className="shimmer" style={{ height: 12, width: "55%" }} />
                      <div className="shimmer" style={{ height: 10, width: "40%" }} />
                      <div className="shimmer" style={{ height: 9, width: "30%" }} />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="list-empty">
                  <div className="list-empty-icon">💬</div>
                  <div className="list-empty-text">
                    {filter === "all"
                      ? "No sessions yet. Start a conversation to see your history here!"
                      : `No ${LESSON_META[filter]?.label} sessions yet.`}
                  </div>
                  <button className="list-empty-btn" onClick={() => navigate(`/chat?mode=${filter === "all" ? "greeting" : filter}`)}>
                    Start Practising
                  </button>
                </div>
              ) : (
                filtered.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onOpen={openSession}
                  />
                ))
              )}
            </div>
          </div>

          {/* Session viewer */}
          <div className="session-viewer">
            {!activeSession ? (
              <div className="viewer-empty">
                <div className="viewer-empty-icon">👈</div>
                <div className="viewer-empty-text">Select a session to read it</div>
              </div>
            ) : (
              <>
                <div className="viewer-header">
                  <div
                    className="viewer-char-dot"
                    style={{
                      background: `linear-gradient(135deg, ${meta.color}20, ${meta.color}40)`,
                      borderColor: `${meta.color}70`,
                      color: meta.color,
                    }}
                  >
                    {meta.emoji}
                  </div>
                  <div className="viewer-info">
                    <div className="viewer-title">{meta.label} · {char}</div>
                    <div className="viewer-sub">
                      {new Date(activeSession.updated_at || activeSession.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{messages.length} messages
                    </div>
                  </div>
                  <button className="viewer-close" onClick={() => { setActive(null); setMessages([]); }}>✕ Close</button>
                </div>

                <div className="viewer-body">
                  {msgLoading ? (
                    [1,2,3].map(i => (
                      <div key={i} style={{ display: "flex", gap: 8, alignSelf: i % 2 === 0 ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                        <div className="shimmer" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
                        <div className="shimmer" style={{ height: 48, flex: 1, borderRadius: 12 }} />
                      </div>
                    ))
                  ) : (
                    messages.map((msg, i) => (
                      <ReplayBubble key={i} msg={msg} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}