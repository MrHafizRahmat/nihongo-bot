import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { parseResponse, toRomaji } from "../lib/japaneseUtils";

const LESSONS = [
  { id: "greeting",   emoji: "👋", label: "Greetings",          kana: "あいさつ" },
  { id: "self_intro", emoji: "🙋", label: "Self Introduction",   kana: "じこしょうかい" },
  { id: "shopping",   emoji: "❓", label: "Enquiry",             kana: "しつもん" },
  { id: "food",       emoji: "🍜", label: "Restaurant",          kana: "レストラン" },
  { id: "directions", emoji: "📞", label: "Invitation",          kana: "さそい" },
];

const CHARACTER_PROFILES = {
  greeting:   { name: "やまだ ゆい", nameEn: "Yamada Yui",   initial: "ゆ", age: "にじゅっさい", role: "おちゃのみずじょしだいがく にねんせい", traits: "あにめ · ばれーぼーる · YOASOBI", color: "#d4697a", scene: "📍 Campus — Greetings practice", desc: "Practice everyday greetings with ゆい — こんにちは、おげんきですか and more." },
  self_intro: { name: "たなか けんじ", nameEn: "Tanaka Kenji", initial: "け", age: "にじゅうにさい", role: "とうきょうだいがく よねんせい (せんぱい)", traits: "おんがく · えいが · おおさかしゅっしん", color: "#4a7ab0", scene: "📍 University orientation", desc: "Introduce yourself to けんじ — name, hometown, major, and hobbies." },
  shopping:   { name: "すずき はな",  nameEn: "Suzuki Hana",  initial: "は", age: "さんじゅうごさい", role: "コンビニ てんいん", traits: "ななねんのけいけん · よこはましゅっしん", color: "#4a9090", scene: "📍 Convenience store — Enquiry practice", desc: "Practice asking 'what is this?' and 'whose is this?' with はな." },
  food:       { name: "さとう りょう", nameEn: "Sato Ryo",    initial: "り", age: "にじゅうはっさい", role: "にほんりょうりレストラン てんいん", traits: "ふくおかしゅっしん · りょうりずき", color: "#c09050", scene: "📍 Japanese restaurant", desc: "Order food and drinks from りょう using 〇〇をください and syllabus food vocabulary." },
  directions: { name: "きむら あおい", nameEn: "Kimura Aoi",  initial: "あ", age: "じゅうきゅうさい", role: "わせだだいがく いちねんせい", traits: "ながのしゅっしん · はずかしがりや · まじめ", color: "#7a7abf", scene: "📍 Phone call — Invitation practice", desc: "あおい calls to invite you to an activity. Accept or politely decline!" },
};

// ── Feedback card ────────────────────────────────────────────
function FeedbackCard({ feedback, lessonMode }) {
  const LESSON_LABELS = {
    greeting: "Greetings", self_intro: "Self Introduction",
    shopping: "Enquiry", food: "Restaurant", directions: "Invitation",
  };

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <div className="feedback-icon">📝</div>
        <div>
          <div className="feedback-title">Session Feedback</div>
          <div className="feedback-subtitle">{LESSON_LABELS[lessonMode] || lessonMode}</div>
        </div>
      </div>

      <div className="feedback-sections">
        {feedback.vocabulary_notes && (
          <div className="feedback-section">
            <div className="feedback-section-label">📖 Vocabulary</div>
            <div className="feedback-section-body">{feedback.vocabulary_notes}</div>
          </div>
        )}
        {feedback.grammar_notes && (
          <div className="feedback-section">
            <div className="feedback-section-label">🔤 Grammar</div>
            <div className="feedback-section-body">{feedback.grammar_notes}</div>
          </div>
        )}
        {feedback.effort_notes && (
          <div className="feedback-section">
            <div className="feedback-section-label">⭐ Effort</div>
            <div className="feedback-section-body">{feedback.effort_notes}</div>
          </div>
        )}

        {feedback.corrections && feedback.corrections.length > 0 && (
          <div className="feedback-section">
            <div className="feedback-section-label">✏️ Corrections</div>
            <div className="feedback-corrections">
              {feedback.corrections.map((c, i) => (
                <div className="feedback-correction-item" key={i}>
                  <div className="correction-row">
                    <span className="correction-label wrong">✗</span>
                    <span className="correction-wrong">{c.original}</span>
                  </div>
                  <div className="correction-row">
                    <span className="correction-label right">✓</span>
                    <span className="correction-right">{c.corrected}</span>
                  </div>
                  {c.explanation && (
                    <div className="correction-explanation">{c.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback.encouragement && (
          <div className="feedback-encouragement">
            {feedback.encouragement}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Structured assistant bubble ──────────────────────────────
function AssistantBubble({ parsed }) {
  const { japanese, romaji, note } = parsed;
  const [expanded, setExpanded] = useState(false);
  const hasExtra = romaji || note;

  return (
    <div className="structured-bubble">
      {japanese && <div className="bubble-japanese">{japanese}</div>}

      {hasExtra && (
        <button
          className={`bubble-toggle ${expanded ? "open" : ""}`}
          onClick={() => setExpanded(prev => !prev)}
        >
          <span className="bubble-toggle-icon">{expanded ? "▲" : "▼"}</span>
          {expanded ? "Hide" : "Show romaji & notes"}
        </button>
      )}

      {expanded && (
        <div className="bubble-extra">
          {romaji && <div className="bubble-romaji">{romaji}</div>}
          {romaji && note && <div className="bubble-divider" />}
          {note   && <div className="bubble-note">{note}</div>}
        </div>
      )}
    </div>
  );
}

// ── Materials slide-in panel ─────────────────────────────────
function MaterialsPanel({ lessonMode, onClose }) {
  const [materials, setMaterials]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [viewingUrl, setViewingUrl]     = useState(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const { profile } = useAuth();

  useEffect(() => { fetchMaterials(); }, [lessonMode]);

  async function fetchMaterials() {
    setLoading(true);
    const { data: relation } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", profile.id)
      .single();

    if (!relation) { setLoading(false); return; }

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
      {viewingUrl && (
        <div className="viewer-overlay">
          <div className="viewer-bar">
            <span className="viewer-title">📄 {viewingTitle}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="viewer-dl" onClick={() => handleDownload({ file_path: viewingUrl, file_name: viewingTitle + ".pdf" })}>↓ Download</button>
              <button className="viewer-close-btn" onClick={() => setViewingUrl(null)}>✕ Close</button>
            </div>
          </div>
          <iframe className="viewer-frame" src={viewingUrl} title={viewingTitle} />
        </div>
      )}
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

// ── Pre-conversation screen ──────────────────────────────────
function StartScreen({ lessonMode, onStart, starting }) {
  const currentLesson = LESSONS.find(l => l.id === lessonMode);
  const char = CHARACTER_PROFILES[lessonMode];
  return (
    <div className="start-screen">
      {/* Character card */}
      <div className="yui-card">
        <div className="yui-avatar" style={{ background: `linear-gradient(135deg, ${char.color}30, ${char.color}60)`, borderColor: char.color, color: char.color }}>{char.initial}</div>
        <div className="yui-info">
          <div className="yui-name">{char.name} <span className="yui-name-en">{char.nameEn}</span></div>
          <div className="yui-detail">{char.age} · {char.role}</div>
          <div className="yui-detail">{char.traits}</div>
        </div>
      </div>

      {/* Scenario */}
      <div className="scenario-card">
        <div className="scenario-scene">{char.scene}</div>
        <div className="scenario-desc">{char.desc}</div>
        <div className="scenario-lesson">
          {currentLesson?.emoji} Practising: <strong>{currentLesson?.label}</strong> ({currentLesson?.kana})
        </div>
      </div>

      {/* Tips */}
      <div className="tips-card">
        <div className="tips-title">💡 How this works</div>
        <div className="tips-text">{CHARACTER_PROFILES[lessonMode]?.name} will start the conversation. Reply naturally in Japanese or English — they'll gently guide you to use the right vocabulary. Mistakes are okay!</div>
      </div>

      <button className="start-btn" onClick={onStart} disabled={starting}>
        {starting ? (
          <><span className="spinner" /> Starting…</>
        ) : (
          <>はじめましょう！— Start Conversation</>
        )}
      </button>
    </div>
  );
}

// ── Main chat page ───────────────────────────────────────────
export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [lessonMode, setLessonMode]       = useState("greeting");
  const [sessionId, setSessionId]         = useState(null);
  const [authSession, setAuthSession]     = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [starting, setStarting]           = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDone, setSessionDone]     = useState(false);
  const [feedback, setFeedback]           = useState(null);
  const [error, setError]                 = useState("");
  const [showMaterials, setShowMaterials] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  function dbg(label, data) {
  const entry = `[${new Date().toISOString().slice(11,23)}] ${label}: ${JSON.stringify(data, null, 0)}`;
  setDebugLog(prev => [...prev.slice(-60), entry]);
  }

  // Store auth session once — avoids calling getSession() on every message
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () =>{
        setAuthSession(session);
      }, 0)
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Reset when lesson mode changes
  useEffect(() => {
    const mode = searchParams.get("mode") || "greeting";
    setLessonMode(mode);
    setSessionId(null);
    setMessages([]);
    setSessionActive(false);
    setSessionDone(false);
    setFeedback(null);
    setError("");
    setShowMaterials(false);
  }, [searchParams]);

  useEffect(() => {
    if (sessionActive) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, sessionActive]);

  // ── Start conversation (character speaks first) ──────────────
  async function handleStart() {
    setStarting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Not logged in. Please refresh and try again.");
        setStarting(false);
        return;
      }

      const res = await supabase.functions.invoke("chat", {
        body: { lesson_mode: lessonMode, start_session: true },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      const { reply, session_id: newSessionId } = res.data;

      if (newSessionId) setSessionId(newSessionId);

      let parsed = parseResponse(reply);
      if (parsed.japanese) parsed.japanese = await toRomaji(parsed.japanese);

      setMessages([{ role: "assistant", parsed, id: "opening" }]);
      setSessionActive(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setError("Could not start conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  // ── Reset session ────────────────────────────────────────────
  function resetSession() {
    setSessionId(null);
    setMessages([]);
    setSessionActive(false);
    setSessionDone(false);
    setFeedback(null);
    setError("");
  }

  // ── Send message ─────────────────────────────────────────────
  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || sessionDone) return;
    console.log("[1] sendMessage called:", { text, lessonMode, sessionId });
    dbg("1 sendMessage", { text: text.slice(0,30), lessonMode, sessionId });

    setInput("");
    setError("");

    const userMsg = { role: "user", content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      console.log("[2] authSession token:", authSession?.access_token?.slice(0, 20) + "...");
      dbg("2 token", { ok: !!session?.access_token });
 
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await Promise.race([
        supabase.functions.invoke("chat", {
          body: { message: text, lesson_mode: lessonMode, session_id: sessionId },
          headers: { Authorization: `Bearer ${token}` },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 15000)),
      ]);
      console.log("[3] function response received:", { error: res.error, hasData: !!res.data });
      dbg("3 raw res", { error: res.error?.message, data: JSON.stringify(res.data)?.slice(0,120) });

      if (res.error) throw new Error(res.error.message);

      const { reply, session_id: newSessionId, feedback: fb, session_complete } = res.data;
      console.log("[4] reply length:", reply?.length, "newSessionId:", newSessionId, "session_complete:", session_complete);
      dbg("4 reply", { len: reply?.length, replySnippet: reply?.slice(0,80), newSessionId, session_complete });

      if (newSessionId && !sessionId) setSessionId(newSessionId);

      let parsed = parseResponse(reply);
      console.log("[5] parsed:", { japanese: parsed.japanese?.slice(0, 30), romaji: parsed.romaji?.slice(0, 30), hasNote: !!parsed.note });
      dbg("5 parsed", { jp: parsed.japanese?.slice(0,30), romaji: parsed.romaji?.slice(0,30), hasNote: !!parsed.note });

      if (parsed.japanese) parsed.japanese = await toRomaji(parsed.japanese);
      console.log("[6] toRomaji done");
      dbg("6 toRomaji done", { result: parsed.japanese?.slice(0,40) });

      setMessages(prev => [...prev, {
        role: "assistant", parsed, id: (newSessionId || sessionId) + Date.now()
      }]);
      console.log("[7] message added to state");

      // Handle session completion + feedback
      if (session_complete) {
        setSessionDone(true);
        if (fb) setFeedback(fb);
        console.log("[7b] session complete, feedback:", !!fb);
      }

    } catch (err) {
      console.error("[ERR] sendMessage failed:", err.message);
      dbg("ERR", { msg: err.message });

      if (err.message === "Request timed out") {
        setError("The chatbot is taking too long to respond.");
      } else {
        setError("Something went wrong. Please try again.");
      }

      setMessages(prev =>
        prev.filter(m => m.id !== userMsg.id)
      );
    } finally {
      setLoading(false);
      if (!sessionDone) inputRef.current?.focus();
      console.log("[8] sendMessage complete");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleLessonChange(id) {
    navigate(`/chat?mode=${id}`, { replace: true });
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
        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 12px; cursor: pointer; color: #b0a098; transition: color 0.2s, border-color 0.2s; }
        .nav-btn:hover { color: var(--rose); border-color: rgba(212,105,122,0.3); }
        .nav-btn.materials { background: var(--ink); color: white; border-color: var(--ink); }
        .nav-btn.materials:hover { background: var(--rose); border-color: var(--rose); color: white; }

        /* Lesson bar */
        .lesson-bar { display: flex; gap: 8px; padding: 12px 20px; overflow-x: auto; border-bottom: 1px solid rgba(212,105,122,0.1); flex-shrink: 0; scrollbar-width: none; }
        .lesson-bar::-webkit-scrollbar { display: none; }
        .lesson-chip { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 7px 14px; border-radius: 100px; border: 1.5px solid var(--mist); background: white; cursor: pointer; transition: all 0.2s; color: #9a8880; white-space: nowrap; }
        .lesson-chip:hover { border-color: rgba(212,105,122,0.3); color: var(--charcoal); }
        .lesson-chip.active { background: var(--ink); border-color: var(--ink); color: white; }
        .lesson-chip-kana { font-family: 'Noto Serif JP', serif; font-size: 0.72rem; opacity: 0.7; }

        /* Start screen */
        .start-screen { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 32px 20px; max-width: 520px; margin: 0 auto; width: 100%; }
        .yui-card { background: white; border: 1.5px solid var(--mist); border-radius: 14px; padding: 20px; display: flex; gap: 16px; align-items: center; width: 100%; }
        .yui-avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif JP', serif; font-size: 1.4rem; flex-shrink: 0; border: 2px solid; }
        .yui-name { font-family: 'Shippori Mincho', serif; font-size: 1.05rem; font-weight: 600; color: var(--ink); margin-bottom: 3px; }
        .yui-name-en { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #9a8880; font-weight: 400; margin-left: 6px; }
        .yui-detail { font-family: 'DM Sans', sans-serif; font-size: 0.76rem; color: #9a8880; line-height: 1.6; }
        .scenario-card { background: var(--paper); border: 1.5px solid var(--mist); border-radius: 12px; padding: 18px 20px; width: 100%; }
        .scenario-scene { font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: var(--rose); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px; }
        .scenario-desc { font-family: 'Shippori Mincho', serif; font-size: 1rem; color: var(--ink); margin-bottom: 8px; }
        .scenario-lesson { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #9a8880; }
        .tips-card { background: rgba(212,105,122,0.05); border: 1px solid rgba(212,105,122,0.15); border-radius: 10px; padding: 14px 18px; width: 100%; }
        .tips-title { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 600; color: var(--rose); margin-bottom: 5px; }
        .tips-text { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #7a6a60; line-height: 1.6; }
        .start-btn { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; background: var(--ink); color: white; border: none; border-radius: 8px; padding: 14px; cursor: pointer; transition: background 0.2s, transform 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .start-btn:hover { background: var(--rose); transform: translateY(-1px); }
        .start-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Chat body */
        .chat-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; max-width: 760px; width: 100%; margin: 0 auto; align-self: stretch; }
        .chat-character-bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--paper); border: 1.5px solid var(--mist); border-radius: 10px; margin-bottom: 4px; }
        .char-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Noto Serif JP', serif; font-size: 0.9rem; border: 1.5px solid; flex-shrink: 0; }
        .char-info { flex: 1; }
        .char-name { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; color: var(--ink); }
        .char-scene { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #9a8880; }
        .reset-link { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #b0a098; background: none; border: none; cursor: pointer; padding: 0; transition: color 0.2s; }
        .reset-link:hover { color: var(--rose); }

        /* Messages */
        .message { display: flex; gap: 10px; max-width: 82%; }
        .message.user { align-self: flex-end; flex-direction: row-reverse; }
        .message.assistant { align-self: flex-start; }
        .avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-top: 2px; }
        .avatar.assistant { border: 1.5px solid; font-family: 'Noto Serif JP', serif; font-size: 0.78rem; }
        .avatar.user { background: rgba(46,38,34,0.08); }
        .bubble.user { padding: 11px 15px; border-radius: 16px; border-bottom-right-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; line-height: 1.65; word-break: break-word; background: var(--ink); color: white; }
        .structured-bubble { background: white; border: 1.5px solid var(--mist); border-radius: 16px; border-bottom-left-radius: 4px; padding: 14px 16px; display: flex; flex-direction: column; gap: 0; word-break: break-word; }
        .bubble-japanese { font-family: 'Noto Serif JP', serif; font-size: 1.15rem; color: var(--ink); letter-spacing: 0.05em; line-height: 1.6; padding-bottom: 4px; }
        .bubble-romaji { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--rose); letter-spacing: 0.03em; padding-bottom: 10px; }
        .bubble-divider { border: none; border-top: 1px solid var(--mist); margin-bottom: 10px; }
        .bubble-note { font-family: 'DM Sans', sans-serif; font-size: 0.86rem; color: #5a4a44; line-height: 1.65; }
        .bubble-toggle {
          display: flex; align-items: center; gap: 5px; margin-top: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 500;
          color: #b0a098; background: none; border: 1px solid var(--mist);
          border-radius: 100px; padding: 3px 10px; cursor: pointer;
          transition: color 0.2s, border-color 0.2s; width: fit-content;
        }
        .bubble-toggle:hover, .bubble-toggle.open { color: var(--rose); border-color: var(--rose-light); }
        .bubble-toggle-icon { font-size: 0.6rem; }
        .bubble-extra { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--mist); display: flex; flex-direction: column; gap: 0; }

        /* Feedback card */
        .feedback-card { background: var(--paper); border: 2px solid var(--rose-light); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; align-self: stretch; margin-top: 8px; }
        .feedback-header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--mist); }
        .feedback-icon { font-size: 1.8rem; }
        .feedback-title { font-family: 'Shippori Mincho', serif; font-size: 1.05rem; font-weight: 600; color: var(--ink); }
        .feedback-subtitle { font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: var(--rose); margin-top: 2px; letter-spacing: 0.06em; }
        .feedback-sections { display: flex; flex-direction: column; gap: 14px; }
        .feedback-section { display: flex; flex-direction: column; gap: 5px; }
        .feedback-section-label { font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 600; color: var(--charcoal); text-transform: uppercase; letter-spacing: 0.08em; }
        .feedback-section-body { font-family: 'DM Sans', sans-serif; font-size: 0.86rem; color: #5a4a44; line-height: 1.7; }
        .feedback-corrections { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
        .feedback-correction-item { background: white; border: 1px solid var(--mist); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
        .correction-row { display: flex; align-items: baseline; gap: 8px; }
        .correction-label { font-size: 0.75rem; font-weight: 700; width: 16px; flex-shrink: 0; }
        .correction-label.wrong { color: #d4697a; }
        .correction-label.right { color: #4a9090; }
        .correction-wrong { font-family: 'Noto Serif JP', serif; font-size: 0.9rem; color: #c08080; text-decoration: line-through; }
        .correction-right { font-family: 'Noto Serif JP', serif; font-size: 0.9rem; color: #4a9090; }
        .correction-explanation { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #9a8880; margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--mist); }
        .feedback-encouragement { background: rgba(212,105,122,0.06); border: 1px solid rgba(212,105,122,0.2); border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--charcoal); line-height: 1.65; }

        /* Session done banner */
        .session-done-banner { align-self: stretch; background: var(--ink); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .session-done-text { font-family: 'DM Sans', sans-serif; font-size: 0.86rem; color: rgba(255,255,255,0.8); }
        .session-done-btn { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500; background: var(--rose); color: white; border: none; border-radius: 6px; padding: 8px 18px; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; }
        .session-done-btn:hover { opacity: 0.85; }

        /* Typing */
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
        .mat-close { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 10px; cursor: pointer; color: #9a8880; }
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

        /* PDF viewer */
        .viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; flex-direction: column; }
        .viewer-bar { background: var(--charcoal); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .viewer-title { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: white; font-weight: 500; }
        .viewer-dl { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: white; background: var(--rose); border: none; border-radius: 5px; padding: 6px 14px; cursor: pointer; }
        .viewer-close-btn { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.6); background: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 5px 14px; cursor: pointer; }
        .viewer-frame { flex: 1; width: 100%; border: none; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }

        @media (max-width: 600px) {
          .nav { padding: 12px 16px; }
          .chat-body { padding: 16px 12px; }
          .message { max-width: 90%; }
          .input-area { padding: 12px; }
          .mat-panel { width: 100%; }
          .start-screen { padding: 20px 16px; }
        }
      `}</style>

      {showMaterials && (
        <MaterialsPanel lessonMode={lessonMode} onClose={() => setShowMaterials(false)} />
      )}

      <div className="chat-page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">🎓 {displayName}</span>
            <button className="nav-btn materials" onClick={() => setShowMaterials(true)}>📄 Materials</button>
            <button className="nav-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        <div className="lesson-bar">
          {LESSONS.map(l => (
            <button key={l.id} className={`lesson-chip ${lessonMode === l.id ? "active" : ""}`} onClick={() => handleLessonChange(l.id)}>
              {l.emoji} {l.label}
              {lessonMode !== l.id && <span className="lesson-chip-kana">{l.kana}</span>}
            </button>
          ))}
        </div>

        {!sessionId ? (
          <StartScreen lessonMode={lessonMode} onStart={handleStart} starting={starting} />
        ) : (
          <>
            <div className="chat-body">
              <div className="chat-character-bar">
                <div className="char-avatar" style={{ background: `linear-gradient(135deg, ${CHARACTER_PROFILES[lessonMode]?.color}25, ${CHARACTER_PROFILES[lessonMode]?.color}45)`, borderColor: `${CHARACTER_PROFILES[lessonMode]?.color}80`, color: CHARACTER_PROFILES[lessonMode]?.color }}>{CHARACTER_PROFILES[lessonMode]?.initial}</div>
                <div className="char-info">
                  <div className="char-name">{CHARACTER_PROFILES[lessonMode]?.name} · {CHARACTER_PROFILES[lessonMode]?.scene}</div>
                  <div className="char-scene">{CHARACTER_PROFILES[lessonMode]?.desc}</div>
                </div>
                <button className="reset-link" onClick={resetSession}>↺ New Session</button>
              </div>

              {messages.map((m, i) => (
                <div key={m.id || i} className={`message ${m.role}`}>
                  <div className={`avatar ${m.role}`} style={m.role === "assistant" ? { background: `linear-gradient(135deg, ${CHARACTER_PROFILES[lessonMode]?.color}20, ${CHARACTER_PROFILES[lessonMode]?.color}40)`, borderColor: `${CHARACTER_PROFILES[lessonMode]?.color}70`, color: CHARACTER_PROFILES[lessonMode]?.color } : {}}>
                    {m.role === "assistant" ? (CHARACTER_PROFILES[lessonMode]?.initial || "？") : "🎓"}
                  </div>
                  {m.role === "assistant"
                    ? <AssistantBubble parsed={m.parsed} />
                    : <div className="bubble user">{m.content}</div>
                  }
                </div>
              ))}

              {loading && (
                <div className="typing">
                  <div className="avatar assistant" style={{ background: `linear-gradient(135deg, ${CHARACTER_PROFILES[lessonMode]?.color}20, ${CHARACTER_PROFILES[lessonMode]?.color}40)`, borderColor: `${CHARACTER_PROFILES[lessonMode]?.color}70`, color: CHARACTER_PROFILES[lessonMode]?.color }}>{CHARACTER_PROFILES[lessonMode]?.initial || "？"}</div>
                  <div className="typing-bubble">
                    <div className="dot" /><div className="dot" /><div className="dot" />
                  </div>
                </div>
              )}

              {error && <div className="error-bar">⚠ {error}</div>}

              {/* Feedback card — appears at bottom of chat */}
              {feedback && (
                <FeedbackCard feedback={feedback} lessonMode={lessonMode} />
              )}

              {/* Session done banner */}
              {sessionDone && (
                <div className="session-done-banner">
                  <span className="session-done-text">✅ Session complete! Great work practising today.</span>
                  <button className="session-done-btn" onClick={resetSession}>↺ Start New Session</button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="input-area">
              <div className="input-wrap">
                <textarea
                  ref={inputRef}
                  className="input-box"
                  rows={1}
                  placeholder={sessionDone ? "Session complete — start a new session to continue" : `Reply to ${CHARACTER_PROFILES[lessonMode]?.name || ""}… type in Japanese or English`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sessionDone}
                  style={sessionDone ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                />
                <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim() || sessionDone}>➤</button>
              </div>
              <div className="input-hint">
                {sessionDone ? "Session ended · Use ↺ Start New Session to practice again" : "Press Enter to send · Shift+Enter for new line"}
              </div>
            </div>
            {/* ── Debug panel ── remove before production ── */}
            <div style={{position:"fixed",bottom:60,right:12,zIndex:999}}>
              <button
                onClick={() => setShowDebug(p => !p)}
                style={{fontSize:"0.7rem",padding:"4px 10px",background:"#1a1210",color:"#fdf6ee",
                border:"none",borderRadius:6,cursor:"pointer",opacity:0.85}}>
                {showDebug ? "hide debug" : "🐛 debug"}
              </button>
              {showDebug && (
              <div style={{width:340,maxHeight:320,overflowY:"auto",background:"#1a1210",color:"#a0f0a0",
              fontSize:"0.68rem",fontFamily:"monospace",padding:"8px 10px",borderRadius:8,
              marginTop:4,lineHeight:1.6}}>
                {debugLog.length === 0
                ? <span style={{color:"#888"}}>no logs yet — send a message</span>
                : debugLog.map((l,i) => <div key={i}>{l}</div>)}
              </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}