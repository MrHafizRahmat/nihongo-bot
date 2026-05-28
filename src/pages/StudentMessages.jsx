import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function StudentMessages() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [teacher, setTeacher]     = useState(null);
  const [convId, setConvId]       = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");

  const displayName = profile?.full_name || profile?.email || "Student";

  useEffect(() => { if (profile?.id) init(); }, [profile?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`msg:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [convId]);

  async function init() {
    setLoading(true);
    const { data: rel } = await supabase.from("teacher_students").select("teacher_id").eq("student_id", profile.id).single();
    if (!rel) { setLoading(false); return; }

    const { data: tp, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", rel.teacher_id)
      .maybeSingle();

    setTeacher(tp);

    const conv = await getOrCreateConv(profile.id, rel.teacher_id);
    setConvId(conv.id);
    await fetchMessages(conv.id);

    await supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id).neq("sender_id", profile.id).is("read_at", null);

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function getOrCreateConv(a, b) {
    // Try both orderings separately — the .or() nested and() syntax is unreliable
    const { data: ex1 } = await supabase.from("conversations").select("id")
      .eq("participant_a", a).eq("participant_b", b).maybeSingle();
    if (ex1) return ex1;

    const { data: ex2 } = await supabase.from("conversations").select("id")
      .eq("participant_a", b).eq("participant_b", a).maybeSingle();
    if (ex2) return ex2;

    // Neither exists — create one
    const { data: cr } = await supabase.from("conversations")
      .insert({ participant_a: a, participant_b: b }).select("id").single();
    return cr;
  }

  async function fetchMessages(cid) {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", cid).order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || !convId) return;
    setInput(""); setSending(true); setError("");

    console.log("sending text:", JSON.stringify(text));
console.log("convId:", convId);
console.log("profile.id:", profile.id);

    const { data: inserted, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: convId, sender_id: profile.id, content: text })
      .select()
      .single();

    console.log("insert result:", inserted);
console.log("insert error:", err); // add this

    if (err) {
      setError("Failed to send. Please try again.");
    } else if (inserted) {
      // Add to state immediately — don't wait for realtime
      setMessages(prev => prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted]);
    }

    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  function formatTime(iso) {
    const d = new Date(iso);
    const diffDays = Math.floor((new Date() - d) / 86400000);
    const time = d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return time;
    if (diffDays === 1) return "Yesterday " + time;
    return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" }) + " " + time;
  }

  function groupByDate(msgs) {
    const out = []; let lastDate = null;
    for (const msg of msgs) {
      const date = new Date(msg.created_at).toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" });
      if (date !== lastDate) { out.push({ type: "date", label: date }); lastDate = date; }
      out.push({ type: "msg", ...msg });
    }
    return out;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&family=Shippori+Mincho:wght@600&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--cream:#fdf6ee;--ink:#1a1210;--charcoal:#2e2622;--rose:#d4697a;--rose-light:#f2b8c0;--mist:#e8ddd4;--paper:#faf2e8}
        body{background:var(--cream)}
        .page{height:100vh;display:flex;flex-direction:column;background:var(--cream)}
        .nav{display:flex;justify-content:space-between;align-items:center;padding:14px 28px;border-bottom:1px solid rgba(212,105,122,0.12);flex-shrink:0}
        .nav-logo{font-family:'Noto Serif JP',serif;font-size:.95rem;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px}
        .nav-dot{width:7px;height:7px;border-radius:50%;background:var(--rose)}
        .nav-right{display:flex;align-items:center;gap:12px}
        .nav-user{font-family:'DM Sans',sans-serif;font-size:.8rem;color:#9a8880}
        .nav-btn{font-family:'DM Sans',sans-serif;font-size:.78rem;background:none;border:1px solid var(--mist);border-radius:5px;padding:5px 12px;cursor:pointer;color:#b0a098;transition:color .2s}
        .nav-btn:hover{color:var(--rose)}
        .chat-header{display:flex;align-items:center;gap:12px;padding:14px 28px;border-bottom:1px solid rgba(212,105,122,.1);background:var(--paper);flex-shrink:0}
        .t-avatar{width:38px;height:38px;border-radius:50%;background:rgba(74,144,144,.15);border:1.5px solid rgba(74,144,144,.3);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .t-name{font-family:'Shippori Mincho',serif;font-size:.95rem;font-weight:600;color:var(--ink)}
        .t-role{font-family:'DM Sans',sans-serif;font-size:.72rem;color:#9a8880;margin-top:1px}
        .chat-body{flex:1;overflow-y:auto;padding:20px 28px;display:flex;flex-direction:column;gap:10px}
        .date-label{text-align:center;font-family:'DM Sans',sans-serif;font-size:.68rem;color:#c0b0a8;letter-spacing:.08em;padding:4px 0}
        .msg-row{display:flex;gap:8px;max-width:72%}
        .msg-row.mine{align-self:flex-end;flex-direction:row-reverse}
        .msg-row.theirs{align-self:flex-start}
        .m-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;align-self:flex-end}
        .m-avatar.t{background:rgba(74,144,144,.15);border:1px solid rgba(74,144,144,.3)}
        .m-avatar.s{background:rgba(46,38,34,.08)}
        .msg-content{display:flex;flex-direction:column;gap:3px}
        .msg-row.mine .msg-content{align-items:flex-end}
        .bubble{padding:10px 14px;border-radius:16px;font-family:'DM Sans',sans-serif;font-size:.88rem;line-height:1.6;word-break:break-word}
        .bubble.mine{background:var(--ink);color:white;border-bottom-right-radius:4px}
        .bubble.theirs{background:white;border:1.5px solid var(--mist);color:var(--ink);border-bottom-left-radius:4px}
        .msg-time{font-family:'DM Sans',sans-serif;font-size:.66rem;color:#c0b0a8;padding:0 4px}
        .no-teacher{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px;text-align:center}
        .no-teacher-icon{font-size:2.5rem}
        .no-teacher-text{font-family:'DM Sans',sans-serif;font-size:.88rem;color:#b0a098;line-height:1.6}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}
        .shimmer{background:var(--mist);border-radius:8px;animation:shimmer 1.2s ease infinite}
        .error-bar{align-self:center;font-family:'DM Sans',sans-serif;font-size:.8rem;color:var(--rose);background:rgba(212,105,122,.08);border:1px solid rgba(212,105,122,.2);border-radius:8px;padding:8px 16px}
        .input-area{flex-shrink:0;border-top:1px solid rgba(212,105,122,.1);padding:14px 28px;background:var(--cream)}
        .input-wrap{display:flex;gap:10px;align-items:flex-end;max-width:860px;margin:0 auto}
        .input-box{flex:1;font-family:'DM Sans',sans-serif;font-size:.92rem;color:var(--ink);background:white;border:1.5px solid var(--mist);border-radius:12px;padding:11px 16px;outline:none;resize:none;max-height:120px;line-height:1.5;transition:border-color .2s,box-shadow .2s}
        .input-box:focus{border-color:var(--rose-light);box-shadow:0 0 0 3px rgba(212,105,122,.08)}
        .input-box::placeholder{color:#c0b0a8}
        .send-btn{width:42px;height:42px;border-radius:10px;border:none;background:var(--ink);color:white;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:background .2s,transform .15s}
        .send-btn:hover{background:var(--rose);transform:scale(1.05)}
        .send-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .input-hint{text-align:center;margin-top:6px;font-family:'DM Sans',sans-serif;font-size:.7rem;color:#c0b0a8}
        @media(max-width:600px){.nav,.chat-header,.input-area{padding:12px 16px}.chat-body{padding:16px}.msg-row{max-width:85%}}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">🎓 {displayName}</span>
            <button className="nav-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        {loading ? (
          <div className="chat-body" style={{ gap: 14 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display:"flex", gap:8, alignSelf: i%2===0 ? "flex-end":"flex-start", maxWidth:"60%" }}>
                <div className="shimmer" style={{ width:30, height:30, borderRadius:"50%", flexShrink:0 }} />
                <div className="shimmer" style={{ height:44, flex:1, borderRadius:14 }} />
              </div>
            ))}
          </div>
        ) : !teacher ? (
          <div className="no-teacher">
            <div className="no-teacher-icon">📭</div>
            <div className="no-teacher-text">You haven't been assigned to a teacher yet.<br />Ask your teacher to register you first.</div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="t-avatar">📋</div>
              <div>
                <div className="t-name">{teacher.full_name || teacher.email}</div>
                <div className="t-role">せんせい · Your Teacher</div>
              </div>
            </div>

            <div className="chat-body">
              {messages.length === 0 && (
                <div style={{ alignSelf:"center", fontFamily:"'DM Sans',sans-serif", fontSize:".82rem", color:"#c0b0a8", padding:"24px 0" }}>
                  No messages yet. Say hello to your teacher! 👋
                </div>
              )}

              {groupByDate(messages).map((item, i) => {
                if (item.type === "date") return <div key={i} className="date-label">{item.label}</div>;
                const mine = item.sender_id === profile.id;
                return (
                  <div key={item.id} className={`msg-row ${mine ? "mine" : "theirs"}`}>
                    <div className={`m-avatar ${mine ? "s" : "t"}`}>{mine ? "🎓" : "📋"}</div>
                    <div className="msg-content">
                      <div className={`bubble ${mine ? "mine" : "theirs"}`}>{item.content}</div>
                      <div className="msg-time">{formatTime(item.created_at)}</div>
                    </div>
                  </div>
                );
              })}

              {error && <div className="error-bar">⚠ {error}</div>}
              <div ref={bottomRef} />
            </div>

            <div className="input-area">
              <div className="input-wrap">
                <textarea ref={inputRef} className="input-box" rows={1}
                  placeholder="Message your teacher…" value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                />
                <button className="send-btn" onClick={sendMessage} disabled={sending || !input.trim()}>➤</button>
              </div>
              <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}