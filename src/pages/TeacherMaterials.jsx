import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function TeacherMaterials() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const fileRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Viewer state
  const [viewingUrl, setViewingUrl] = useState(null);
  const [viewingTitle, setViewingTitle] = useState("");

  const displayName = profile?.full_name || profile?.email || "Sensei";

  useEffect(() => {
    if (profile?.id) fetchMaterials();
  }, [profile?.id]);

  async function fetchMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false });

    if (!error) setMaterials(data || []);
    setLoading(false);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be under 20MB.");
      return;
    }
    setError("");
    setSelectedFile(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!selectedFile) { setError("Please select a PDF file."); return; }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      // Upload to Supabase Storage — folder per teacher
      const filePath = `${profile.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, selectedFile, { contentType: "application/pdf" });

      if (uploadError) throw new Error(uploadError.message);

      // Save metadata to materials table
      const { error: dbError } = await supabase.from("materials").insert({
        teacher_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        file_path: filePath,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
      });

      if (dbError) throw new Error(dbError.message);

      setSuccess("✅ Material uploaded successfully!");
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchMaterials();

    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(material) {
    if (!confirm(`Delete "${material.title}"? This cannot be undone.`)) return;

    const { error: storageError } = await supabase.storage
      .from("materials")
      .remove([material.file_path]);

    if (storageError) { setError("Failed to delete file."); return; }

    const { error: dbError } = await supabase
      .from("materials")
      .delete()
      .eq("id", material.id);

    if (dbError) { setError("Failed to delete record."); return; }

    setMaterials(prev => prev.filter(m => m.id !== material.id));
    setSuccess("Material deleted.");
  }

  async function handleView(material) {
    const { data, error } = await supabase.storage
      .from("materials")
      .createSignedUrl(material.file_path, 3600); // 1 hour

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
          --bg: #f4f9f9; --ink: #0e1f1f; --teal: #4a9090; --teal-light: #a0c8c8;
          --mist: #d8eaea; --paper: #eef6f6; --charcoal: #1e3535; --rose: #d4697a;
        }
        body { background: var(--bg); }
        .page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }

        /* Nav */
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; background: var(--charcoal); }
        .nav-logo { font-family: 'Noto Serif JP', serif; font-size: 1rem; color: rgba(255,255,255,0.9); display: flex; align-items: center; gap: 10px; }
        .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .nav-right { display: flex; align-items: center; gap: 14px; }
        .nav-user { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 7px; }
        .user-avatar { width: 30px; height: 30px; border-radius: 50%; background: rgba(74,144,144,0.25); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
        .back-btn { font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: rgba(255,255,255,0.45); background: none; border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 6px 14px; cursor: pointer; transition: color 0.2s; }
        .back-btn:hover { color: var(--teal-light); }

        /* Layout */
        .layout { display: grid; grid-template-columns: 340px 1fr; gap: 32px; padding: 48px; max-width: 1100px; margin: 0 auto; width: 100%; }
        @media (max-width: 800px) { .layout { grid-template-columns: 1fr; padding: 28px 20px; } }

        /* Upload panel */
        .panel { background: white; border: 1.5px solid var(--mist); border-radius: 12px; padding: 28px; height: fit-content; }
        .panel-kana { font-family: 'Noto Serif JP', serif; font-size: 0.85rem; color: var(--teal); letter-spacing: 0.15em; display: block; margin-bottom: 4px; }
        .panel-title { font-family: 'Shippori Mincho', serif; font-size: 1.2rem; font-weight: 600; color: var(--ink); margin-bottom: 20px; }

        .field { margin-bottom: 16px; }
        .field label { display: block; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 500; color: var(--ink); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 7px; }
        .field input, .field textarea { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--ink); background: var(--bg); border: 1.5px solid var(--mist); border-radius: 6px; padding: 10px 13px; outline: none; transition: border-color 0.2s; }
        .field input:focus, .field textarea:focus { border-color: var(--teal); }
        .field textarea { resize: vertical; min-height: 72px; }

        /* File drop zone */
        .file-zone { border: 2px dashed var(--mist); border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; margin-bottom: 16px; }
        .file-zone:hover, .file-zone.has-file { border-color: var(--teal); background: var(--paper); border-style: solid; }
        .file-zone-icon { font-size: 1.6rem; margin-bottom: 6px; }
        .file-zone-text { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #6a9090; }
        .file-zone-name { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--teal); font-weight: 500; margin-top: 4px; }
        input[type="file"] { display: none; }

        /* Messages */
        .msg-error { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--rose); background: rgba(212,105,122,0.07); border-left: 3px solid var(--rose); border-radius: 5px; padding: 9px 13px; margin-bottom: 14px; }
        .msg-success { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: var(--teal); background: rgba(74,144,144,0.07); border-left: 3px solid var(--teal); border-radius: 5px; padding: 9px 13px; margin-bottom: 14px; }

        /* Submit */
        .upload-btn { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500; background: var(--charcoal); color: white; border: none; border-radius: 6px; padding: 12px; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s; }
        .upload-btn::before { content: ''; position: absolute; inset: 0; background: var(--teal); transform: translateX(-101%); transition: transform 0.3s ease; }
        .upload-btn:hover::before { transform: translateX(0); }
        .upload-btn:hover { transform: translateY(-1px); }
        .upload-btn span { position: relative; z-index: 1; }
        .upload-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Materials list */
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .list-title { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.14em; color: #8ab0b0; }
        .list-count { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #8ab0b0; }

        .material-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 16px; transition: border-color 0.2s; }
        .material-card:hover { border-color: var(--teal-light); }
        .material-icon { font-size: 1.8rem; flex-shrink: 0; margin-top: 2px; }
        .material-info { flex: 1; min-width: 0; }
        .material-title { font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 500; color: var(--ink); margin-bottom: 3px; }
        .material-desc { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: #6a9090; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .material-meta { font-family: 'DM Sans', sans-serif; font-size: 0.72rem; color: #a0b8b8; display: flex; gap: 12px; }
        .material-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .action-btn { font-family: 'DM Sans', sans-serif; font-size: 0.75rem; padding: 5px 12px; border-radius: 5px; cursor: pointer; border: 1.5px solid; transition: all 0.2s; }
        .action-btn.view { color: var(--teal); border-color: var(--teal-light); background: rgba(74,144,144,0.05); }
        .action-btn.view:hover { background: rgba(74,144,144,0.12); }
        .action-btn.download { color: #6a9090; border-color: var(--mist); background: transparent; }
        .action-btn.download:hover { border-color: #8ab0b0; color: var(--ink); }
        .action-btn.delete { color: var(--rose); border-color: rgba(212,105,122,0.2); background: transparent; }
        .action-btn.delete:hover { background: rgba(212,105,122,0.07); }

        /* Empty */
        .empty { background: white; border: 2px dashed var(--mist); border-radius: 10px; padding: 48px 24px; text-align: center; }
        .empty-icon { font-size: 2rem; margin-bottom: 10px; }
        .empty-text { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #8ab0b0; }

        /* Shimmer */
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .shimmer { background: var(--mist); border-radius: 4px; animation: shimmer 1.2s ease infinite; }
        .shimmer-card { background: white; border: 1.5px solid var(--mist); border-radius: 10px; padding: 18px 20px; margin-bottom: 12px; display: flex; gap: 16px; }

        /* PDF Viewer modal */
        .viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; flex-direction: column; }
        .viewer-bar { background: var(--charcoal); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .viewer-bar-title { font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: white; font-weight: 500; }
        .viewer-close { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: rgba(255,255,255,0.6); background: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 5px 14px; cursor: pointer; transition: color 0.2s; }
        .viewer-close:hover { color: white; }
        .viewer-frame { flex: 1; width: 100%; border: none; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 7px; vertical-align: middle; }
      `}</style>

      {/* PDF Viewer overlay */}
      {viewingUrl && (
        <div className="viewer-overlay">
          <div className="viewer-bar">
            <span className="viewer-bar-title">📄 {viewingTitle}</span>
            <button className="viewer-close" onClick={() => setViewingUrl(null)}>✕ Close</button>
          </div>
          <iframe className="viewer-frame" src={viewingUrl} title={viewingTitle} />
        </div>
      )}

      <div className="page">
        <nav className="nav">
          <div className="nav-logo"><div className="nav-dot" />にほんご</div>
          <div className="nav-right">
            <div className="nav-user"><div className="user-avatar">📋</div>{displayName}</div>
            <button className="back-btn" onClick={() => navigate("/dashboard/teacher")}>← Dashboard</button>
          </div>
        </nav>

        <div className="layout">
          {/* Upload panel */}
          <div>
            <div className="panel">
              <span className="panel-kana">きょうざい</span>
              <div className="panel-title">Upload Material</div>

              <form onSubmit={handleUpload}>
                <div className="field">
                  <label>Title</label>
                  <input type="text" placeholder="e.g. Week 1 — Greetings" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div className="field">
                  <label>Description (optional)</label>
                  <textarea placeholder="Brief description of this material…" value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className={`file-zone ${selectedFile ? "has-file" : ""}`} onClick={() => fileRef.current?.click()}>
                  <div className="file-zone-icon">{selectedFile ? "✅" : "📄"}</div>
                  {selectedFile
                    ? <div className="file-zone-name">{selectedFile.name}</div>
                    : <div className="file-zone-text">Click to select PDF (max 20MB)</div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} />

                {error && <div className="msg-error">{error}</div>}
                {success && <div className="msg-success">{success}</div>}

                <button className="upload-btn" type="submit" disabled={uploading}>
                  <span>{uploading && <span className="spinner" />}{uploading ? "Uploading…" : "アップロード — Upload"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Materials list */}
          <div>
            <div className="list-header">
              <div className="list-title">Uploaded Materials</div>
              {!loading && <div className="list-count">{materials.length} file{materials.length !== 1 ? "s" : ""}</div>}
            </div>

            {loading ? (
              [1,2,3].map(i => (
                <div className="shimmer-card" key={i}>
                  <div className="shimmer" style={{ width: 36, height: 36, borderRadius: 6 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="shimmer" style={{ height: 13, width: "55%" }} />
                    <div className="shimmer" style={{ height: 10, width: "80%" }} />
                    <div className="shimmer" style={{ height: 9, width: "35%" }} />
                  </div>
                </div>
              ))
            ) : materials.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📂</div>
                <div className="empty-text">No materials uploaded yet.<br />Use the form to share your first PDF.</div>
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
                      <span>{formatDate(m.created_at)}</span>
                      <span>{m.file_name}</span>
                    </div>
                  </div>
                  <div className="material-actions">
                    <button className="action-btn view" onClick={() => handleView(m)}>View</button>
                    <button className="action-btn download" onClick={() => handleDownload(m)}>↓</button>
                    <button className="action-btn delete" onClick={() => handleDelete(m)}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}