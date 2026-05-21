import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { parseResponse, toHiragana, prewarmTokenizer } from "../lib/japaneseUtils";

const LESSONS = [
  { id: "greeting",   emoji: "👋", label: "Greetings",        kana: "あいさつ" },
  { id: "self_intro", emoji: "🙋", label: "Self Introduction", kana: "じこしょうかい" },
  { id: "shopping",   emoji: "🛒", label: "Shopping",          kana: "かいもの" },
  { id: "food",       emoji: "🍱", label: "Ordering Food",     kana: "たべもの" },
  { id: "directions", emoji: "🗺️", label: "Directions",       kana: "みちあんない" },
];

const STARTERS = {
  greeting:   { japanese: "こんにちは！", romaji: "Konnichiwa!", note: "Let's prepare for your JFS exam 📚 — Greetings. How do you say 'Good morning' in Japanese? Give it a try!" },
  self_intro: { japanese: "はじめまして！", romaji: "Hajimemashite!", note: "JFS exam practice — Self Introduction 📚. Try: わたしは～です (watashi wa ~ desu). What is your name?" },
  shopping:   { japanese: "いらっしゃいませ！", romaji: "Irasshaimase!", note: "JFS exam practice — Shopping 📚. I'm the shopkeeper. Key phrase: いくらですか (ikura desu ka - How much is it?) Try asking me!" },
  food:       { japanese: "いらっしゃいませ！", romaji: "Irasshaimase!", note: "JFS exam practice — Food 📚. I'm your waiter. Key pattern: ～をひとつください (~ wo hitotsu kudasai). Try ordering!" },
  directions: { japanese: "すみません！", romaji: "Sumimasen!", note: "JFS exam practice — Directions 📚. Key question: ～はどこですか (~ wa doko desu ka). Try asking where the station is!" },
};

// ── Structured assistant bubble ──────────────────────────────
function AssistantBubble({ parsed }) {
  const { japanese, romaji, note } = parsed;
  return (
    <div className="structured-bubble">
      {japanese && <div className="bubble-japanese">{japanese}</div>}
      {romaji   && <div className="bubble-romaji">{romaji}</div>}
      {(japanese || romaji) && note && <div className="bubble-divider" />}
      {note     && <div className="bubble-note">{note}</div>}
    </div>
  );
}

// ── Materials slide-in panel ─────────────────────────────────
function MaterialsPanel({ lessonMode, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [viewingUrl, setViewingUrl]     = useState(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const { profile } = useAuth();

  useEffect(() => {
    fetchMaterials();
  }, [lessonMode]);

  async function fetchMaterials() {
    setLoading(true);

    const { data: relation } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", profile.id)
      .single();

    if (!relation) { setLoading(false); return; }

    // Fetch materials tagged to this lesson OR tagged as 'all'
    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("teacher_id", relation.teacher_id)
      .in("lesson_mode", [lessonMode, "all"])
      .order("created_at", { ascending: false });

    setMaterials(data || []);
    setLoading(false);
  }

  async function handleView(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.file_path, 3600);
    if (error) return;
    setViewingUrl(data.signedUrl);
    setViewingTitle(material.title);
  }

  async function handleDownload(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.file_path, 60);
    if (error) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = material.file_name;
    a.click();
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const currentLesson = LESSONS.find(l => l.id === lessonMode);

  return (
    <>
      {/* PDF viewer overlay — sits above the panel */}
      {viewingUrl && (
        <div className="viewer-overlay">
          <div className="viewer-bar">
            <span className="viewer-title">📄 {viewingTitle}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="viewer-dl" onClick={() => handleDownload({ file_path: viewingUrl, file_name: viewingTitle + ".pdf" })}>↓ Download</button>
              <button className="viewer-close" onClick={() => setViewingUrl(null)}>✕ Close</button>
            </div>
          </div>
          <iframe className="viewer-frame" src={viewingUrl} title={viewingTitle} />
        </div>
      )}

      {/* Slide-in panel */}
      <div className="mat-overlay" onClick={onClose} />
      <div className="mat-panel">
        <div className="mat-header">
          <div>
            <div className="mat-kana">{currentLesson?.kana} — きょうざい</div>
            <div className="mat-title">{currentLesson?.emoji} {currentLesson?.label} Materials</div>
          </div>
          <button className="mat-close" onClick={onClose}>✕</button>
        </div>

        <div className="mat-body">
          {loading ? (
            [1,2,3].map(i => (
              <div className="mat-shimmer" key={i}>
                <div className="shimmer" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="shimmer" style={{ height: 11, width: "60%" }} />
                  <div className="shimmer" style={{ height: 9, width: "40%" }} />
                </div>
              </div>
            ))
          ) : materials.length === 0 ? (
            <div className="mat-empty">
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📭</div>
              <div className="mat-empty-text">No materials for this lesson yet.</div>
            </div>
          ) : (
            materials.map(m => (
              <div className="mat-card" key={m.id}>
                <div style={{ fontSize: "1.4rem", flexShrink: 0 }}>📄</div>
                <div className="mat-card-info">
                  <div className="mat-card-title">{m.title}</div>
                  {m.description && <div className="mat-card-desc">{m.description}</div>}
                  <div className="mat-card-meta">{formatSize(m.file_size)}</div>
                </div>
                <div className="mat-card-actions">
                  <button className="mat-btn view" onClick={() => handleView(m)}>View</button>
                  <button className="mat-btn dl"   onClick={() => handleDownload(m)}>↓</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Main chat page ───────────────────────────────────────────
export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const initialMode = searchParams.get("mode") || "greeting";
  const [lessonMode, setLessonMode]   = useState(initialMode);
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [showMaterials, setShowMaterials] = useState(false);

  useEffect(() => { prewarmTokenizer(); }, []);

  // Reset chat when lesson mode changes
  useEffect(() => {
    setSessionId(null);
    setMessages([{ role: "assistant", parsed: STARTERS[lessonMode], id: "starter" }]);
    setError("");
    setShowMaterials(false);
    inputRef.current?.focus();
  }, [lessonMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function resetSession() {
    setSessionId(null);
    setMessages([{ role: "assistant", parsed: STARTERS[lessonMode], id: "starter-reset-" + Date.now() }]);
    setError("");
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");

    const userMsg = { role: "user", content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke("chat", {
        body: { message: text, lesson_mode: lessonMode, session_id: sessionId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);

      const { reply, session_id: newSessionId } = res.data;

      const activeSessionId = sessionId || newSessionId;

      if (!sessionId) {
        setSessionId(activeSessionId);
      }

      let parsed = parseResponse(reply);
      if (parsed.japanese) parsed.japanese = await toHiragana(parsed.japanese);

      setMessages(prev => [
        ...prev,
        { role: "assistant", parsed, id: (newSessionId || sessionId) + Date.now() }
      ]);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleLessonChange(id) {
    navigate(`/chat?mode=${id}`, { replace: true });
    setLessonMode(id);
  }

  const currentLesson = LESSONS.find(l => l.id === lessonMode);
  const displayName = profile?.full_name || "Student";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600&family=Shippori+Mincho:wght@600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #fdf6ee; --ink: #1a1210; --charcoal: #2e2622;
          --rose: #d4697a; --rose-light: #f2b8c0; --mist: #e8ddd4; --paper: #faf2e8;
        }
        body { background: var(--cream); }
        .chat-page { height: 100vh; display: flex; flex-direction: column; background: var(--cream); overflow: hidden; }

        /* Nav */
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 14px 28px; border-bottom: 1px solid rgba(212,105,122,0.12); background: var(--cream); flex-shrink: 0; }
        .nav-logo { font-family: 'Noto Serif JP', serif; font-size: 0.95rem; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; }
        .nav-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose); }
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .nav-user { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #9a8880; }
        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 12px; cursor: pointer; transition: color 0.2s, border-color 0.2s; color: #b0a098; }
        .nav-btn:hover { color: var(--rose); border-color: rgba(212,105,122,0.3); }
        .nav-btn.materials { background: var(--ink); color: white; border-color: var(--ink); }
        .nav-btn.materials:hover { background: var(--rose); border-color: var(--rose); color: white; }
        .nav-btn.reset { color: #9a8880; }
        .nav-btn.reset:hover { color: var(--rose); }

        /* Lesson bar */
        .lesson-bar { display: flex; gap: 8px; padding: 12px 20px; overflow-x: auto; border-bottom: 1px solid rgba(212,105,122,0.1); flex-shrink: 0; scrollbar-width: none; }
        .lesson-bar::-webkit-scrollbar { display: none; }
        .lesson-chip { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 7px 14px; border-radius: 100px; border: 1.5px solid var(--mist); background: white; cursor: pointer; transition: all 0.2s; color: #9a8880; white-space: nowrap; }
        .lesson-chip:hover { border-color: rgba(212,105,122,0.3); color: var(--charcoal); }
        .lesson-chip.active { background: var(--ink); border-color: var(--ink); color: white; }
        .lesson-chip-kana { font-family: 'Noto Serif JP', serif; font-size: 0.72rem; opacity: 0.7; }

        /* Chat body */
        .chat-body { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; max-width: 760px; width: 100%; margin: 0 auto; align-self: stretch; }

        /* Mode header */
        .mode-header { text-align: center; padding: 12px 0 4px; }
        .mode-header-emoji { font-size: 1.8rem; display: block; margin-bottom: 4px; }
        .mode-header-kana { font-family: 'Noto Serif JP', serif; font-size: 0.85rem; color: var(--rose); letter-spacing: 0.15em; display: block; }
        .mode-header-label { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #b0a098; margin-top: 2px; }

        /* Messages */
        .message { display: flex; gap: 10px; max-width: 82%; }
        .message.user { align-self: flex-end; flex-direction: row-reverse; }
        .message.assistant { align-self: flex-start; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-top: 2px; }
        .avatar.assistant { background: rgba(212,105,122,0.12); }
        .avatar.user { background: rgba(46,38,34,0.08); }
        .bubble.user { padding: 11px 15px; border-radius: 16px; border-bottom-right-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; line-height: 1.65; word-break: break-word; background: var(--ink); color: white; }
        .structured-bubble { background: white; border: 1.5px solid var(--mist); border-radius: 16px; border-bottom-left-radius: 4px; padding: 14px 16px; display: flex; flex-direction: column; gap: 0; word-break: break-word; }
        .bubble-japanese { font-family: 'Noto Serif JP', serif; font-size: 1.15rem; font-weight: 400; color: var(--ink); letter-spacing: 0.05em; line-height: 1.6; padding-bottom: 4px; }
        .bubble-romaji { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--rose); font-weight: 400; letter-spacing: 0.03em; padding-bottom: 10px; }
        .bubble-divider { border: none; border-top: 1px solid var(--mist); margin-bottom: 10px; }
        .bubble-note { font-family: 'DM Sans', sans-serif; font-size: 0.86rem; color: #5a4a44; line-height: 1.65; }

        /* Typing indicator */
        .typing { display: flex; gap: 10px; align-self: flex-start; }
        .typing-bubble { background: white; border: 1.5px solid var(--mist); border-radius: 16px; border-bottom-left-radius: 4px; padding: 13px 16px; display: flex; gap: 5px; align-items: center; }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose-light); animation: bounce 1.2s ease infinite; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        .error-bar { align-self: center; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: var(--rose); background: rgba(212,105,122,0.08); border: 1px solid rgba(212,105,122,0.2); border-radius: 8px; padding: 8px 16px; }

        /* Input */
        .input-area { flex-shrink: 0; border-top: 1px solid rgba(212,105,122,0.1); padding: 14px 20px; background: var(--cream); }
        .input-wrap { display: flex; gap: 10px; align-items: flex-end; max-width: 760px; margin: 0 auto; }
        .input-box { flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: var(--ink); background: white; border: 1.5px solid var(--mist); border-radius: 12px; padding: 11px 16px; outline: none; resize: none; max-height: 120px; line-height: 1.5; transition: border-color 0.2s, box-shadow 0.2s; }
        .input-box:focus { border-color: var(--rose-light); box-shadow: 0 0 0 3px rgba(212,105,122,0.08); }
        .input-box::placeholder { color: #c0b0a8; }
        .send-btn { width: 42px; height: 42px; border-radius: 10px; border: none; background: var(--ink); color: white; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: background 0.2s, transform 0.15s; }
        .send-btn:hover { background: var(--rose); transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .input-hint { text-align: center; margin-top: 6px; font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #c0b0a8; }

        /* Materials panel */
        .mat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 50; }
        .mat-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 92vw; background: var(--cream); border-left: 1.5px solid var(--mist); z-index: 51; display: flex; flex-direction: column; animation: slideIn 0.25s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .mat-header { padding: 20px 20px 16px; border-bottom: 1px solid var(--mist); display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; background: var(--paper); }
        .mat-kana { font-family: 'Noto Serif JP', serif; font-size: 0.78rem; color: var(--rose); letter-spacing: 0.15em; margin-bottom: 3px; }
        .mat-title { font-family: 'Shippori Mincho', serif; font-size: 1rem; font-weight: 600; color: var(--ink); }
        .mat-close { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 10px; cursor: pointer; color: #9a8880; transition: color 0.2s; }
        .mat-close:hover { color: var(--rose); }
        .mat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .mat-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start; transition: border-color 0.2s; }
        .mat-card:hover { border-color: rgba(212,105,122,0.25); }
        .mat-card-info { flex: 1; min-width: 0; }
        .mat-card-title { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; color: var(--ink); margin-bottom: 3px; }
        .mat-card-desc { font-family: 'DM Sans', sans-serif; font-size: 0.76rem; color: #9a8880; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mat-card-meta { font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #c0b0a8; }
        .mat-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .mat-btn { font-family: 'DM Sans', sans-serif; font-size: 0.74rem; padding: 5px 10px; border-radius: 5px; cursor: pointer; border: 1.5px solid; transition: all 0.2s; }
        .mat-btn.view { color: var(--ink); border-color: var(--mist); background: transparent; }
        .mat-btn.view:hover { border-color: var(--rose); color: var(--rose); }
        .mat-btn.dl { color: var(--rose); border-color: var(--rose-light); background: rgba(212,105,122,0.05); }
        .mat-btn.dl:hover { background: rgba(212,105,122,0.12); }
        .mat-empty { text-align: center; padding: 40px 20px; }
        .mat-empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #b0a098; }
        .mat-shimmer { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px; }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .shimmer { background: var(--mist); border-radius: 4px; animation: shimmer 1.2s ease infinite; }

        /* PDF viewer (inside materials panel context) */
        .viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; flex-direction: column; }
        .viewer-bar { background: var(--charcoal); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .viewer-title { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: white; font-weight: 500; }
        .viewer-dl { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: white; background: var(--rose); border: none; border-radius: 5px; padding: 6px 14px; cursor: pointer; }
        .viewer-close { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.6); background: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 5px 14px; cursor: pointer; }
        .viewer-frame { flex: 1; width: 100%; border: none; }

        @media (max-width: 600px) {
          .nav { padding: 12px 16px; }
          .chat-body { padding: 16px 12px; }
          .message { max-width: 90%; }
          .input-area { padding: 12px; }
          .mat-panel { width: 100%; }
        }
      `}</style>

      {/* Materials panel */}
      {showMaterials && (
        <MaterialsPanel
          lessonMode={lessonMode}
          onClose={() => setShowMaterials(false)}
        />
      )}

      <div className="chat-page">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">🎓 {displayName}</span>
            <button className="nav-btn materials" onClick={() => setShowMaterials(true)}>
              📄 Materials
            </button>
            <button className="nav-btn reset" onClick={resetSession} title="Start a new session">
              ↺ New Session
            </button>
            <button className="nav-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        {/* Lesson selector */}
        <div className="lesson-bar">
          {LESSONS.map(l => (
            <button key={l.id} className={`lesson-chip ${lessonMode === l.id ? "active" : ""}`} onClick={() => handleLessonChange(l.id)}>
              {l.emoji} {l.label}
              {lessonMode !== l.id && <span className="lesson-chip-kana">{l.kana}</span>}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="chat-body">
          <div className="mode-header">
            <span className="mode-header-emoji">{currentLesson?.emoji}</span>
            <span className="mode-header-kana">{currentLesson?.kana}</span>
            <div className="mode-header-label">{currentLesson?.label} Practice — JFS Exam Prep</div>
          </div>

          {messages.map((m, i) => (
            <div key={m.id || i} className={`message ${m.role}`}>
              <div className={`avatar ${m.role}`}>{m.role === "assistant" ? "🤖" : "🎓"}</div>
              {m.role === "assistant"
                ? <AssistantBubble parsed={m.parsed} />
                : <div className="bubble user">{m.content}</div>
              }
            </div>
          ))}

          {loading && (
            <div className="typing">
              <div className="avatar assistant">🤖</div>
              <div className="typing-bubble">
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
            </div>
          )}

          {error && <div className="error-bar">⚠ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrap">
            <textarea
              ref={inputRef}
              className="input-box"
              rows={1}
              placeholder={`Practice ${currentLesson?.label.toLowerCase()}… type in Japanese or English`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>➤</button>
          </div>
          <div className="input-hint">Press Enter to send · Shift+Enter for new line · ↺ New Session to restart</div>
        </div>
      </div>
    </>
  );
}