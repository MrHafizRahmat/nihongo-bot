import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const LESSONS = [
  { id: "greeting",   emoji: "👋", label: "Greetings",       kana: "あいさつ" },
  { id: "self_intro", emoji: "🙋", label: "Self Introduction", kana: "じこしょうかい" },
  { id: "shopping",   emoji: "🛒", label: "Shopping",         kana: "かいもの" },
  { id: "food",       emoji: "🍱", label: "Ordering Food",    kana: "たべもの" },
  { id: "directions", emoji: "🗺️", label: "Directions",      kana: "みちあんない" },
];

const STARTERS = {
  greeting:   "こんにちは！(konnichiwa - Hello!) I'm your Japanese tutor. Let's practice greetings today! 😊 Try saying hello to me in Japanese!",
  self_intro: "はじめまして！(hajimemashite - Nice to meet you!) Let's practice self-introductions. Try: わたしは～です (watashi wa ~ desu - I am ~)",
  shopping:   "いらっしゃいませ！(irasshaimase - Welcome!) I'm the shopkeeper. Try asking the price: いくらですか？(ikura desu ka - How much is it?)",
  food:       "いらっしゃいませ！(irasshaimase - Welcome!) I'm your waiter. Try: メニューをください (menyu wo kudasai - Please give me the menu)",
  directions: "すみません！(sumimasen - Excuse me!) Let's practice directions. Try: えきはどこですか？(eki wa doko desu ka - Where is the station?)",
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const initialMode = searchParams.get("mode") || "greeting";
  const [lessonMode, setLessonMode] = useState(initialMode);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When lesson mode changes, reset chat with new starter message
  useEffect(() => {
    setSessionId(null);
    setMessages([
      { role: "assistant", content: STARTERS[lessonMode], id: "starter" }
    ]);
    setError("");
    inputRef.current?.focus();
  }, [lessonMode]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");

    // Optimistically add user message
    const userMsg = { role: "user", content: text, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke("chat", {
        body: {
          message: text,
          lesson_mode: lessonMode,
          session_id: sessionId,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);

      const { reply, session_id: newSessionId } = res.data;

      const activeSessionId = sessionId || newSessionId;

      if (!sessionId) setSessionId(activeSessionId);

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: reply, id: crypto.randomUUID() }
      ]);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const currentLesson = LESSONS.find(l => l.id === lessonMode);
  const displayName = profile?.full_name || "Student";

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

        .chat-page {
          height: 100vh; display: flex; flex-direction: column; background: var(--cream);
        }

        /* Top nav */
        .nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 28px; border-bottom: 1px solid rgba(212,105,122,0.12);
          background: var(--cream); flex-shrink: 0;
        }
        .nav-logo { font-family: 'Noto Serif JP', serif; font-size: 0.95rem; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; }
        .nav-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-user { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #9a8880; }
        .back-btn { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #b0a098; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 5px 12px; cursor: pointer; transition: color 0.2s; }
        .back-btn:hover { color: var(--rose); }

        /* Lesson selector */
        .lesson-bar {
          display: flex; gap: 8px; padding: 12px 20px; overflow-x: auto;
          border-bottom: 1px solid rgba(212,105,122,0.1); flex-shrink: 0;
          scrollbar-width: none;
        }
        .lesson-bar::-webkit-scrollbar { display: none; }
        .lesson-chip {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500;
          padding: 7px 14px; border-radius: 100px; border: 1.5px solid var(--mist);
          background: white; cursor: pointer; transition: all 0.2s; color: #9a8880;
          white-space: nowrap;
        }
        .lesson-chip:hover { border-color: rgba(212,105,122,0.3); color: var(--charcoal); }
        .lesson-chip.active { background: var(--ink); border-color: var(--ink); color: white; }
        .lesson-chip-kana { font-family: 'Noto Serif JP', serif; font-size: 0.72rem; opacity: 0.7; }

        /* Chat area */
        .chat-body {
          flex: 1; overflow-y: auto; padding: 24px 20px;
          display: flex; flex-direction: column; gap: 16px;
          max-width: 760px; width: 100%; margin: 0 auto; align-self: stretch;
        }

        /* Mode header */
        .mode-header {
          text-align: center; padding: 12px 0 4px;
        }
        .mode-header-emoji { font-size: 1.8rem; display: block; margin-bottom: 4px; }
        .mode-header-kana { font-family: 'Noto Serif JP', serif; font-size: 0.85rem; color: var(--rose); letter-spacing: 0.15em; display: block; }
        .mode-header-label { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #b0a098; margin-top: 2px; }

        /* Messages */
        .message { display: flex; gap: 10px; max-width: 78%; }
        .message.user { align-self: flex-end; flex-direction: row-reverse; }
        .message.assistant { align-self: flex-start; }

        .avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; margin-top: 2px;
        }
        .avatar.assistant { background: rgba(212,105,122,0.12); }
        .avatar.user { background: rgba(46,38,34,0.08); }

        .bubble {
          padding: 11px 15px; border-radius: 16px;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; line-height: 1.65;
          word-break: break-word;
        }
        .bubble.assistant {
          background: white; border: 1.5px solid var(--mist); color: var(--ink);
          border-bottom-left-radius: 4px;
        }
        .bubble.user {
          background: var(--ink); color: white;
          border-bottom-right-radius: 4px;
        }

        /* Typing indicator */
        .typing { display: flex; gap: 10px; align-self: flex-start; }
        .typing-bubble {
          background: white; border: 1.5px solid var(--mist);
          border-radius: 16px; border-bottom-left-radius: 4px;
          padding: 13px 16px; display: flex; gap: 5px; align-items: center;
        }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose-light); animation: bounce 1.2s ease infinite; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }

        /* Error */
        .error-bar {
          align-self: center; font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
          color: var(--rose); background: rgba(212,105,122,0.08);
          border: 1px solid rgba(212,105,122,0.2); border-radius: 8px;
          padding: 8px 16px;
        }

        /* Input area */
        .input-area {
          flex-shrink: 0; border-top: 1px solid rgba(212,105,122,0.1);
          padding: 14px 20px; background: var(--cream);
        }
        .input-wrap {
          display: flex; gap: 10px; align-items: flex-end;
          max-width: 760px; margin: 0 auto;
        }
        .input-box {
          flex: 1; font-family: 'DM Sans', sans-serif; font-size: 0.92rem;
          color: var(--ink); background: white; border: 1.5px solid var(--mist);
          border-radius: 12px; padding: 11px 16px; outline: none; resize: none;
          max-height: 120px; line-height: 1.5;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-box:focus { border-color: var(--rose-light); box-shadow: 0 0 0 3px rgba(212,105,122,0.08); }
        .input-box::placeholder { color: #c0b0a8; }

        .send-btn {
          width: 42px; height: 42px; border-radius: 10px; border: none;
          background: var(--ink); color: white; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
          transition: background 0.2s, transform 0.15s;
        }
        .send-btn:hover { background: var(--rose); transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .input-hint {
          text-align: center; margin-top: 6px;
          font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #c0b0a8;
        }

        @media (max-width: 600px) {
          .nav { padding: 12px 16px; }
          .chat-body { padding: 16px 12px; }
          .message { max-width: 88%; }
          .input-area { padding: 12px 12px; }
        }
      `}</style>

      <div className="chat-page">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">🎓 {displayName}</span>
            <button className="back-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        {/* Lesson mode selector */}
        <div className="lesson-bar">
          {LESSONS.map(l => (
            <button
              key={l.id}
              className={`lesson-chip ${lessonMode === l.id ? "active" : ""}`}
              onClick={() => setLessonMode(l.id)}
            >
              {l.emoji}
              {l.label}
              {lessonMode !== l.id && <span className="lesson-chip-kana">{l.kana}</span>}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="chat-body">
          {/* Mode header */}
          <div className="mode-header">
            <span className="mode-header-emoji">{currentLesson?.emoji}</span>
            <span className="mode-header-kana">{currentLesson?.kana}</span>
            <div className="mode-header-label">{currentLesson?.label} Practice</div>
          </div>

          {messages.map((m, i) => (
            <div key={m.id || i} className={`message ${m.role}`}>
              <div className={`avatar ${m.role}`}>
                {m.role === "assistant" ? "🤖" : "🎓"}
              </div>
              <div className={`bubble ${m.role}`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="typing">
              <div className="avatar assistant">🤖</div>
              <div className="typing-bubble">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
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
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>
          <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </>
  );
}