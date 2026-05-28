import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function TeacherMessages() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(true);
  const [msgLoading, setMsgLoading]       = useState(false);
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState("");
  const [unreadMap, setUnreadMap]         = useState({});

  const displayName = profile?.full_name || profile?.email || "Sensei";

  useEffect(() => { if (profile?.id) fetchConversations(); }, [profile?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Real-time for active conversation
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`tmsg:${activeConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          // Mark as read immediately if it's from student
          if (payload.new.sender_id !== profile.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", payload.new.id);
          }
        }
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeConv]);

  async function fetchConversations() {
    setLoading(true);

    // Get all students under this teacher
    const { data: students } = await supabase
      .from("teacher_students")
      .select("student:student_id(id, full_name, email, level)")
      .eq("teacher_id", profile.id);

    if (!students || students.length === 0) { setLoading(false); return; }

    const studentIds = students.map(s => s.student.id);

    // Get conversations with these students — query each ordering separately
    const { data: convs1 } = await supabase
      .from("conversations").select("*")
      .eq("participant_a", profile.id)
      .in("participant_b", studentIds);

    const { data: convs2 } = await supabase
      .from("conversations").select("*")
      .eq("participant_b", profile.id)
      .in("participant_a", studentIds);

    const convs = [...(convs1 || []), ...(convs2 || [])].sort((a, b) =>
      new Date(b.updated_at) - new Date(a.updated_at)
    );

    // Map student info onto conversations
    const enriched = (convs || []).map(conv => {
      const studentId = conv.participant_a === profile.id ? conv.participant_b : conv.participant_a;
      const student = students.find(s => s.student.id === studentId)?.student;
      return { ...conv, student };
    }).filter(c => c.student);

    // For students with no conversation yet, show them too
    const existingStudentIds = new Set(enriched.map(c => c.student?.id));
    const noConv = students
      .map(s => s.student)
      .filter(s => !existingStudentIds.has(s.id))
      .map(s => ({ id: null, student: s, updated_at: null }));

    setConversations([...enriched, ...noConv]);

    // Count unread per conversation
    if (convs && convs.length > 0) {
      const convIds = convs.map(c => c.id);
      const { data: unread } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", profile.id)
        .is("read_at", null);

      const map = {};
      (unread || []).forEach(m => { map[m.conversation_id] = (map[m.conversation_id] || 0) + 1; });
      setUnreadMap(map);
    }

    setLoading(false);
  }

  async function openConversation(conv) {
    let cid = conv.id;
    if (!cid) {
      // Check both orderings separately
      const { data: ex1 } = await supabase.from("conversations").select("id")
        .eq("participant_a", profile.id).eq("participant_b", conv.student.id).maybeSingle();
      const { data: ex2 } = !ex1 ? await supabase.from("conversations").select("id")
        .eq("participant_a", conv.student.id).eq("participant_b", profile.id).maybeSingle()
        : { data: null };

      if (ex1) { cid = ex1.id; }
      else if (ex2) { cid = ex2.id; }
      else {
        const { data: created } = await supabase.from("conversations")
          .insert({ participant_a: profile.id, participant_b: conv.student.id })
          .select("id").single();
        cid = created.id;
      }
      setConversations(prev => prev.map(c =>
        c.student?.id === conv.student.id ? { ...c, id: cid } : c
      ));
    }

    setActiveConv({ ...conv, id: cid });
    setMsgLoading(true);
    setMessages([]);

    const { data } = await supabase.from("messages").select("*")
      .eq("conversation_id", cid).order("created_at", { ascending: true });
    setMessages(data || []);
    setMsgLoading(false);

    await supabase.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", cid).neq("sender_id", profile.id).is("read_at", null);

    setUnreadMap(prev => ({ ...prev, [cid]: 0 }));
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending || !activeConv?.id) return;
    setInput(""); setSending(true); setError("");

    const { data: inserted, error: err } = await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: profile.id,
      content: text,
    }).select().single();

    if (err) {
      setError("Failed to send.");
    } else if (inserted) {
      setMessages(prev => prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted]);
    }

    await supabase.from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConv.id);

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const diffDays = Math.floor((new Date() - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
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
        :root{--bg:#f4f9f9;--ink:#0e1f1f;--teal:#4a9090;--teal-light:#a0c8c8;--mist:#d8eaea;--paper:#eef6f6;--charcoal:#1e3535;--rose:#d4697a}
        body{background:var(--bg)}
        .page{height:100vh;display:flex;flex-direction:column;background:var(--bg)}
        .nav{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:var(--charcoal);flex-shrink:0}
        .nav-logo{font-family:'Noto Serif JP',serif;font-size:.95rem;color:rgba(255,255,255,.9);display:flex;align-items:center;gap:8px}
        .nav-dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
        .nav-right{display:flex;align-items:center;gap:12px}
        .nav-user{font-family:'DM Sans',sans-serif;font-size:.8rem;color:rgba(255,255,255,.5)}
        .nav-btn{font-family:'DM Sans',sans-serif;font-size:.78rem;background:none;border:1px solid rgba(255,255,255,.2);border-radius:5px;padding:5px 12px;cursor:pointer;color:rgba(255,255,255,.5);transition:color .2s}
        .nav-btn:hover{color:var(--teal-light)}

        /* Two panel layout */
        .layout{flex:1;display:grid;grid-template-columns:300px 1fr;overflow:hidden}
        @media(max-width:700px){.layout{grid-template-columns:1fr}}

        /* Sidebar */
        .sidebar{border-right:1px solid var(--mist);display:flex;flex-direction:column;overflow:hidden}
        .sidebar-header{padding:18px 18px 14px;border-bottom:1px solid var(--mist);flex-shrink:0}
        .sidebar-kana{font-family:'Noto Serif JP',serif;font-size:.78rem;color:var(--teal);letter-spacing:.15em;display:block;margin-bottom:3px}
        .sidebar-title{font-family:'Shippori Mincho',serif;font-size:1rem;font-weight:600;color:var(--ink)}
        .conv-list{flex:1;overflow-y:auto;padding:8px}
        .conv-item{display:flex;gap:10px;align-items:center;padding:12px 12px;border-radius:8px;cursor:pointer;transition:background .15s;border:1.5px solid transparent}
        .conv-item:hover{background:white}
        .conv-item.active{background:white;border-color:var(--teal-light)}
        .conv-avatar{width:36px;height:36px;border-radius:50%;background:rgba(74,144,144,.15);border:1.5px solid var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0}
        .conv-info{flex:1;min-width:0}
        .conv-name{font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .conv-level{font-family:'DM Sans',sans-serif;font-size:.7rem;color:#6a9090}
        .conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0}
        .conv-time{font-family:'DM Sans',sans-serif;font-size:.66rem;color:#a0b8b8}
        .unread-badge{background:var(--teal);color:white;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:600;padding:1px 7px;min-width:18px;text-align:center}

        /* Main chat */
        .chat-main{display:flex;flex-direction:column;overflow:hidden}
        .chat-header{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--mist);background:var(--paper);flex-shrink:0}
        .ch-avatar{width:38px;height:38px;border-radius:50%;background:rgba(74,144,144,.15);border:1.5px solid var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .ch-name{font-family:'Shippori Mincho',serif;font-size:.95rem;font-weight:600;color:var(--ink)}
        .ch-sub{font-family:'DM Sans',sans-serif;font-size:.72rem;color:#6a9090;margin-top:1px}
        .chat-body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:10px}
        .date-label{text-align:center;font-family:'DM Sans',sans-serif;font-size:.68rem;color:#a0b8b8;letter-spacing:.08em;padding:4px 0}
        .msg-row{display:flex;gap:8px;max-width:72%}
        .msg-row.mine{align-self:flex-end;flex-direction:row-reverse}
        .msg-row.theirs{align-self:flex-start}
        .m-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;flex-shrink:0;align-self:flex-end}
        .m-avatar.t{background:rgba(74,144,144,.15);border:1px solid var(--teal-light)}
        .m-avatar.s{background:rgba(14,31,31,.08)}
        .msg-content{display:flex;flex-direction:column;gap:3px}
        .msg-row.mine .msg-content{align-items:flex-end}
        .bubble{padding:10px 14px;border-radius:16px;font-family:'DM Sans',sans-serif;font-size:.88rem;line-height:1.6;word-break:break-word}
        .bubble.mine{background:var(--charcoal);color:white;border-bottom-right-radius:4px}
        .bubble.theirs{background:white;border:1.5px solid var(--mist);color:var(--ink);border-bottom-left-radius:4px}
        .msg-time{font-family:'DM Sans',sans-serif;font-size:.66rem;color:#a0b8b8;padding:0 4px}
        .chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#8ab0b0}
        .chat-empty-icon{font-size:2.5rem}
        .chat-empty-text{font-family:'DM Sans',sans-serif;font-size:.85rem}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}
        .shimmer{background:var(--mist);border-radius:8px;animation:shimmer 1.2s ease infinite}
        .error-bar{align-self:center;font-family:'DM Sans',sans-serif;font-size:.8rem;color:var(--rose);background:rgba(212,105,122,.08);border:1px solid rgba(212,105,122,.2);border-radius:8px;padding:8px 16px}
        .input-area{flex-shrink:0;border-top:1px solid var(--mist);padding:14px 24px;background:var(--bg)}
        .input-wrap{display:flex;gap:10px;align-items:flex-end}
        .input-box{flex:1;font-family:'DM Sans',sans-serif;font-size:.9rem;color:var(--ink);background:white;border:1.5px solid var(--mist);border-radius:12px;padding:11px 16px;outline:none;resize:none;max-height:120px;line-height:1.5;transition:border-color .2s}
        .input-box:focus{border-color:var(--teal-light);box-shadow:0 0 0 3px rgba(74,144,144,.1)}
        .input-box::placeholder{color:#a0b8b8}
        .send-btn{width:42px;height:42px;border-radius:10px;border:none;background:var(--charcoal);color:white;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:background .2s,transform .15s}
        .send-btn:hover{background:var(--teal);transform:scale(1.05)}
        .send-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .input-hint{text-align:center;margin-top:6px;font-family:'DM Sans',sans-serif;font-size:.7rem;color:#a0b8b8}
        @media(max-width:600px){.nav{padding:14px 16px}.chat-body,.input-area{padding:14px 16px}.msg-row{max-width:86%}}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <span className="nav-user">📋 {displayName}</span>
            <button className="nav-btn" onClick={() => navigate("/dashboard/teacher")}>← Dashboard</button>
          </div>
        </nav>

        <div className="layout">
          {/* Sidebar — conversation list */}
          <div className="sidebar">
            <div className="sidebar-header">
              <span className="sidebar-kana">めっせーじ</span>
              <div className="sidebar-title">Student Messages</div>
            </div>
            <div className="conv-list">
              {loading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"12px", alignItems:"center" }}>
                    <div className="shimmer" style={{ width:36, height:36, borderRadius:"50%", flexShrink:0 }} />
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                      <div className="shimmer" style={{ height:11, width:"60%" }} />
                      <div className="shimmer" style={{ height:9, width:"40%" }} />
                    </div>
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div style={{ padding:"24px 12px", fontFamily:"'DM Sans',sans-serif", fontSize:".8rem", color:"#8ab0b0", textAlign:"center" }}>
                  No students yet.
                </div>
              ) : (
                conversations.map(conv => {
                  const unread = conv.id ? (unreadMap[conv.id] || 0) : 0;
                  const isActive = activeConv?.student?.id === conv.student?.id;
                  return (
                    <div key={conv.student?.id} className={`conv-item ${isActive ? "active" : ""}`} onClick={() => openConversation(conv)}>
                      <div className="conv-avatar">🎓</div>
                      <div className="conv-info">
                        <div className="conv-name">{conv.student?.full_name || conv.student?.email}</div>
                        <div className="conv-level">{conv.student?.level || "—"} · {conv.student?.email}</div>
                      </div>
                      <div className="conv-meta">
                        {conv.updated_at && <div className="conv-time">{formatTime(conv.updated_at)}</div>}
                        {unread > 0 && <div className="unread-badge">{unread}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Main chat area */}
          <div className="chat-main">
            {!activeConv ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">👈</div>
                <div className="chat-empty-text">Select a student to start messaging</div>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <div className="ch-avatar">🎓</div>
                  <div>
                    <div className="ch-name">{activeConv.student?.full_name || activeConv.student?.email}</div>
                    <div className="ch-sub">{activeConv.student?.level} · がくせい</div>
                  </div>
                </div>

                <div className="chat-body">
                  {msgLoading ? (
                    [1,2,3].map(i => (
                      <div key={i} style={{ display:"flex", gap:8, alignSelf:i%2===0?"flex-end":"flex-start", maxWidth:"60%" }}>
                        <div className="shimmer" style={{ width:30, height:30, borderRadius:"50%", flexShrink:0 }} />
                        <div className="shimmer" style={{ height:44, flex:1, borderRadius:14 }} />
                      </div>
                    ))
                  ) : (
                    <>
                      {messages.length === 0 && (
                        <div style={{ alignSelf:"center", fontFamily:"'DM Sans',sans-serif", fontSize:".82rem", color:"#a0b8b8", padding:"24px 0" }}>
                          No messages yet. Start the conversation!
                        </div>
                      )}
                      {groupByDate(messages).map((item, i) => {
                        if (item.type === "date") return <div key={i} className="date-label">{item.label}</div>;
                        const mine = item.sender_id === profile.id;
                        return (
                          <div key={item.id} className={`msg-row ${mine ? "mine" : "theirs"}`}>
                            <div className={`m-avatar ${mine ? "t" : "s"}`}>{mine ? "📋" : "🎓"}</div>
                            <div className="msg-content">
                              <div className={`bubble ${mine ? "mine" : "theirs"}`}>{item.content}</div>
                              <div className="msg-time">{formatTime(item.created_at)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  {error && <div className="error-bar">⚠ {error}</div>}
                  <div ref={bottomRef} />
                </div>

                <div className="input-area">
                  <div className="input-wrap">
                    <textarea ref={inputRef} className="input-box" rows={1}
                      placeholder={`Message ${activeConv.student?.full_name || "student"}…`}
                      value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    />
                    <button className="send-btn" onClick={sendMessage} disabled={sending || !input.trim()}>➤</button>
                  </div>
                  <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}