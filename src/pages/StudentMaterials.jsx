import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function StudentMaterials() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingUrl, setViewingUrl] = useState(null);
  const [viewingTitle, setViewingTitle] = useState("");

  const displayName = profile?.full_name || profile?.email || "Learner";

  useEffect(() => {
    if (profile?.id) fetchMaterials();
  }, [profile?.id]);

  async function fetchMaterials() {
    setLoading(true);

    // Get teacher assigned to this student
    const { data: relation } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", profile.id)
      .single();

    if (!relation) {
      setLoading(false);
      return;
    }

    // Fetch materials from that teacher
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("teacher_id", relation.teacher_id)
      .order("created_at", { ascending: false });

    if (!error) setMaterials(data || []);
    setLoading(false);
  }

  async function handleView(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.file_path, 3600);

    if (error) { setError("Could not open file."); return; }
    setViewingUrl(data.signedUrl);
    setViewingTitle(material.title);
  }

  async function handleDownload(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.file_path, 60);

    if (error) { setError("Could not download file."); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = material.file_name;
    a.click();
  }

  function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  }

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
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; border-bottom: 1px solid rgba(212,105,122,0.12); }
        .nav-logo { font-family: 'Noto Serif JP', serif; font-size: 1rem; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 10px; }
        .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rose); }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-user { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #9a8880; display: flex; align-items: center; gap: 6px; }
        .user-avatar { width: 30px; height: 30px; border-radius: 50%; background: rgba(212,105,122,0.15); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
        .back-btn { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #b0a098; background: none; border: 1px solid var(--mist); border-radius: 5px; padding: 6px 14px; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
        .back-btn:hover { color: var(--rose); border-color: rgba(212,105,122,0.3); }

        /* Content */
        .content { flex: 1; padding: 52px 48px; max-width: 860px; margin: 0 auto; width: 100%; }
        .page-kana { font-family: 'Noto Serif JP', serif; font-size: 0.95rem; color: var(--rose); letter-spacing: 0.18em; display: block; margin-bottom: 6px; }
        .page-title { font-family: 'Shippori Mincho', serif; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 600; color: var(--ink); margin-bottom: 6px; }
        .page-sub { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #9a8880; font-weight: 300; margin-bottom: 36px; }

        /* Error */
        .msg-error { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--rose); background: rgba(212,105,122,0.07); border-left: 3px solid var(--rose); border-radius: 5px; padding: 9px 13px; margin-bottom: 20px; }

        /* Material cards */
        .material-card { background: var(--paper); border: 1.5px solid var(--mist); border-radius: 12px; padding: 22px 24px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 18px; transition: border-color 0.2s, box-shadow 0.2s; }
        .material-card:hover { border-color: rgba(212,105,122,0.3); box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
        .material-icon { font-size: 2rem; flex-shrink: 0; }
        .material-info { flex: 1; min-width: 0; }
        .material-title { font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500; color: var(--ink); margin-bottom: 4px; }
        .material-desc { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #9a8880; margin-bottom: 8px; }
        .material-meta { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #c0b0a8; display: flex; gap: 14px; }
        .material-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: flex-start; }
        .action-btn { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500; padding: 7px 16px; border-radius: 6px; cursor: pointer; border: 1.5px solid; transition: all 0.2s; }
        .action-btn.view { color: var(--ink); border-color: rgba(46,38,34,0.2); background: white; }
        .action-btn.view:hover { border-color: var(--rose); color: var(--rose); }
        .action-btn.download { color: var(--rose); border-color: var(--rose-light); background: rgba(212,105,122,0.05); }
        .action-btn.download:hover { background: rgba(212,105,122,0.1); }

        /* Empty */
        .empty { background: var(--paper); border: 2px dashed var(--mist); border-radius: 12px; padding: 56px 24px; text-align: center; }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .empty-title { font-family: 'Shippori Mincho', serif; font-size: 1.1rem; color: var(--ink); margin-bottom: 6px; }
        .empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #b0a098; }

        /* Shimmer */
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .shimmer { background: var(--mist); border-radius: 4px; animation: shimmer 1.2s ease infinite; }
        .shimmer-card { background: var(--paper); border: 1.5px solid var(--mist); border-radius: 12px; padding: 22px 24px; margin-bottom: 14px; display: flex; gap: 18px; }

        /* PDF Viewer */
        .viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100; display: flex; flex-direction: column; }
        .viewer-bar { background: var(--charcoal); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .viewer-bar-title { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: white; font-weight: 500; }
        .viewer-actions { display: flex; gap: 10px; align-items: center; }
        .viewer-download { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: white; background: var(--rose); border: none; border-radius: 5px; padding: 6px 14px; cursor: pointer; transition: opacity 0.2s; }
        .viewer-download:hover { opacity: 0.85; }
        .viewer-close { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.6); background: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 5px 14px; cursor: pointer; transition: color 0.2s; }
        .viewer-close:hover { color: white; }
        .viewer-frame { flex: 1; width: 100%; border: none; }

        @media (max-width: 600px) {
          .nav { padding: 18px 24px; }
          .content { padding: 36px 20px; }
          .material-card { flex-direction: column; }
          .material-actions { flex-direction: row; }
        }
      `}</style>

      {/* PDF Viewer */}
      {viewingUrl && (
        <div className="viewer-overlay">
          <div className="viewer-bar">
            <span className="viewer-bar-title">📄 {viewingTitle}</span>
            <div className="viewer-actions">
              <button className="viewer-download" onClick={() => handleDownload({ file_path: viewingUrl, file_name: viewingTitle + ".pdf" })}>↓ Download</button>
              <button className="viewer-close" onClick={() => setViewingUrl(null)}>✕ Close</button>
            </div>
          </div>
          <iframe className="viewer-frame" src={viewingUrl} title={viewingTitle} />
        </div>
      )}

      <div className="page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <div className="nav-user"><div className="user-avatar">🎓</div>{displayName}</div>
            <button className="back-btn" onClick={() => navigate("/dashboard/student")}>← Dashboard</button>
          </div>
        </nav>

        <div className="content">
          <span className="page-kana">きょうざい</span>
          <h1 className="page-title">Learning Materials</h1>
          <p className="page-sub">PDFs shared by your teacher — view them here or download for offline use.</p>

          {error && <div className="msg-error">{error}</div>}

          {loading ? (
            [1,2,3].map(i => (
              <div className="shimmer-card" key={i}>
                <div className="shimmer" style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="shimmer" style={{ height: 13, width: "50%" }} />
                  <div className="shimmer" style={{ height: 10, width: "75%" }} />
                  <div className="shimmer" style={{ height: 9, width: "30%" }} />
                </div>
              </div>
            ))
          ) : materials.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No materials yet</div>
              <div className="empty-text">Your teacher hasn't shared any materials yet.<br />Check back soon!</div>
            </div>
          ) : (
            materials.map(m => (
              <div className="material-card" key={m.id}>
                <div className="material-icon">📄</div>
                <div className="material-info">
                  <div className="material-title">{m.title}</div>
                  {m.description && <div className="material-desc">{m.description}</div>}
                  <div className="material-meta">
                    <span>{formatSize(m.file_size)}</span>
                    <span>Shared {formatDate(m.created_at)}</span>
                  </div>
                </div>
                <div className="material-actions">
                  <button className="action-btn view" onClick={() => handleView(m)}>View</button>
                  <button className="action-btn download" onClick={() => handleDownload(m)}>↓ Save</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}