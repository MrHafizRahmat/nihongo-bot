import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const REQUIRED_HEADERS = ["full_name", "email", "password", "level"];

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: "CSV must have a header row and at least one student." };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  if (missing.length > 0) return { error: `Missing columns: ${missing.join(", ")}` };

  const students = lines.slice(1).map((line, i) => {
    const values = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] || ""; });
    return { _row: i + 2, ...obj };
  });

  return { students };
}

export default function RegisterStudents() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [preview, setPreview] = useState(null);   // parsed students before submit
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);    // response from edge function

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setPreview(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const { students, error } = parseCSV(evt.target.result);
      if (error) { setParseError(error); return; }
      setPreview(students);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!preview || preview.length === 0) return;
    setSubmitting(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke("register-students", {
        body: { students: preview },
      });

      if (res.error) throw new Error(res.error.message);
      setResults(res.data);
    } catch (err) {
      setParseError("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setResults(null);
    setParseError("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400&family=Shippori+Mincho:wght@600&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #f4f9f9; --ink: #0e1f1f; --teal: #4a9090; --teal-light: #a0c8c8;
          --mist: #d8eaea; --paper: #eef6f6; --charcoal: #1e3535;
          --rose: #d4697a; --cream: #fdf6ee;
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
        .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .back-btn {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
          color: rgba(255,255,255,0.5); background: none;
          border: 1px solid rgba(255,255,255,0.15); border-radius: 5px;
          padding: 6px 14px; cursor: pointer; transition: color 0.2s, border-color 0.2s;
        }
        .back-btn:hover { color: var(--teal-light); border-color: rgba(74,144,144,0.4); }

        /* Content */
        .content { flex: 1; padding: 48px; max-width: 860px; margin: 0 auto; width: 100%; }

        .page-kana {
          font-family: 'Noto Serif JP', serif; font-size: 0.9rem;
          color: var(--teal); letter-spacing: 0.18em; display: block; margin-bottom: 5px;
        }
        .page-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 600;
          color: var(--ink); margin-bottom: 6px;
        }
        .page-sub {
          font-family: 'DM Sans', sans-serif; font-size: 0.87rem;
          color: #6a9090; font-weight: 300; margin-bottom: 36px;
        }

        /* CSV format hint */
        .hint-box {
          background: var(--paper); border: 1.5px solid var(--mist);
          border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;
        }
        .hint-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 0.12em; color: var(--teal);
          margin-bottom: 10px;
        }
        .hint-code {
          font-family: monospace; font-size: 0.85rem; color: var(--ink);
          background: white; border: 1px solid var(--mist); border-radius: 6px;
          padding: 12px 16px; line-height: 1.7; white-space: pre;
          overflow-x: auto;
        }
        .hint-note {
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          color: #8ab0b0; margin-top: 10px;
        }

        /* Upload zone */
        .upload-zone {
          border: 2px dashed var(--mist); border-radius: 10px;
          padding: 40px; text-align: center; cursor: pointer;
          transition: border-color 0.2s, background 0.2s; margin-bottom: 24px;
          background: white;
        }
        .upload-zone:hover { border-color: var(--teal); background: var(--paper); }
        .upload-zone.has-file { border-color: var(--teal); border-style: solid; background: var(--paper); }
        .upload-icon { font-size: 2rem; margin-bottom: 10px; }
        .upload-text {
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          color: #6a9090; margin-bottom: 6px;
        }
        .upload-filename {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
          color: var(--teal); font-weight: 500;
        }
        .upload-input { display: none; }

        /* Error */
        .error-box {
          background: rgba(212,105,122,0.07); border: 1px solid rgba(212,105,122,0.3);
          border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: var(--rose);
        }

        /* Preview table */
        .section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 0.14em; color: #8ab0b0; margin-bottom: 12px;
        }
        .table-wrap { overflow-x: auto; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th {
          font-family: 'DM Sans', sans-serif; font-size: 0.73rem;
          text-transform: uppercase; letter-spacing: 0.1em; color: #6a9090;
          padding: 10px 14px; text-align: left;
          border-bottom: 1.5px solid var(--mist); background: var(--paper);
        }
        td {
          font-family: 'DM Sans', sans-serif; font-size: 0.86rem;
          color: var(--ink); padding: 11px 14px;
          border-bottom: 1px solid var(--mist); background: white;
        }
        tr:last-child td { border-bottom: none; }
        .level-chip {
          font-size: 0.72rem; padding: 2px 10px; border-radius: 100px;
          border: 1px solid var(--teal-light); color: var(--teal);
          background: rgba(74,144,144,0.07);
        }
        .password-mask { color: #b0c0c0; letter-spacing: 0.1em; }

        /* Buttons */
        .btn-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
        .btn-primary {
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          background: var(--charcoal); color: white; border: none; border-radius: 6px;
          padding: 12px 28px; cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          position: relative; overflow: hidden;
        }
        .btn-primary::before {
          content: ''; position: absolute; inset: 0; background: var(--teal);
          transform: translateX(-101%); transition: transform 0.3s ease;
        }
        .btn-primary:hover::before { transform: translateX(0); }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary span { position: relative; z-index: 1; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-secondary {
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          background: transparent; color: #6a9090;
          border: 1.5px solid var(--mist); border-radius: 6px;
          padding: 12px 24px; cursor: pointer; transition: border-color 0.2s, color 0.2s;
        }
        .btn-secondary:hover { border-color: var(--teal); color: var(--teal); }

        /* Results */
        .results-box {
          background: white; border: 1.5px solid var(--mist);
          border-radius: 10px; overflow: hidden; margin-bottom: 24px;
        }
        .results-header {
          background: var(--paper); padding: 16px 20px;
          display: flex; gap: 24px; border-bottom: 1px solid var(--mist);
        }
        .results-stat {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #6a9090;
        }
        .results-stat strong { color: var(--ink); font-size: 1.1rem; margin-right: 4px; }
        .results-stat.success strong { color: var(--teal); }
        .results-stat.failed strong { color: var(--rose); }
        .result-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 20px; border-bottom: 1px solid var(--mist);
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
        }
        .result-row:last-child { border-bottom: none; }
        .result-badge {
          font-size: 0.72rem; padding: 2px 10px; border-radius: 100px;
          font-weight: 500; flex-shrink: 0;
        }
        .result-badge.success {
          background: rgba(74,144,144,0.1); color: var(--teal); border: 1px solid var(--teal-light);
        }
        .result-badge.failed {
          background: rgba(212,105,122,0.08); color: var(--rose); border: 1px solid rgba(212,105,122,0.3);
        }
        .result-email { color: var(--ink); flex: 1; }
        .result-reason { color: #a0b0b0; font-size: 0.78rem; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          margin-right: 7px; vertical-align: middle;
        }

        @media (max-width: 600px) {
          .nav { padding: 18px 24px; }
          .content { padding: 32px 20px; }
        }
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-dot" />
            にほんご
          </div>
          <button className="back-btn" onClick={() => navigate("/dashboard/teacher")}>
            ← Back to Dashboard
          </button>
        </nav>

        <div className="content">
          <span className="page-kana">がくせいとうろく</span>
          <h1 className="page-title">Register Students</h1>
          <p className="page-sub">Upload a CSV file to register one or multiple students at once.</p>

          {/* Format hint */}
          <div className="hint-box">
            <div className="hint-label">Required CSV Format</div>
            <div className="hint-code">{`full_name,email,password,level\nAhmad Razif,ahmad@school.edu.my,pass1234,A0\nSiti Nora,siti@school.edu.my,pass1234,A1\nMei Lin Tan,meilan@school.edu.my,pass1234,A2`}</div>
            <div className="hint-note">⚠ Level must be A0, A1, or A2. Password minimum 6 characters. Students can log in immediately after registration.</div>
          </div>

          {/* Upload zone */}
          {!preview && !results && (
            <div
              className={`upload-zone ${fileName ? "has-file" : ""}`}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">📂</div>
              {fileName
                ? <div className="upload-filename">✓ {fileName}</div>
                : <>
                    <div className="upload-text">Click to upload your CSV file</div>
                    <div className="upload-text" style={{ fontSize: "0.78rem" }}>.csv files only</div>
                  </>
              }
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="upload-input"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && <div className="error-box">⚠ {parseError}</div>}

          {/* Preview */}
          {preview && !results && (
            <>
              <div className="section-label">{preview.length} student{preview.length !== 1 ? "s" : ""} found — review before submitting</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s, i) => (
                      <tr key={i}>
                        <td style={{ color: "#a0b0b0" }}>{s._row}</td>
                        <td>{s.full_name || <span style={{ color: "#e0a0a0" }}>missing</span>}</td>
                        <td>{s.email || <span style={{ color: "#e0a0a0" }}>missing</span>}</td>
                        <td><span className="password-mask">{"•".repeat(Math.min(s.password?.length || 0, 10))}</span></td>
                        <td><span className="level-chip">{s.level || <span style={{ color: "#e0a0a0" }}>missing</span>}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="btn-row">
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  <span>
                    {submitting && <span className="spinner" />}
                    {submitting ? "Registering..." : `登録 — Register ${preview.length} Student${preview.length !== 1 ? "s" : ""}`}
                  </span>
                </button>
                <button className="btn-secondary" onClick={handleReset}>Upload different file</button>
              </div>
            </>
          )}

          {/* Results */}
          {results && (
            <>
              <div className="section-label">Registration complete</div>
              <div className="results-box">
                <div className="results-header">
                  <div className="results-stat"><strong>{results.total}</strong> Total</div>
                  <div className="results-stat success"><strong>{results.succeeded}</strong> Succeeded</div>
                  <div className="results-stat failed"><strong>{results.failed}</strong> Failed</div>
                </div>
                {results.results.map((r, i) => (
                  <div className="result-row" key={i}>
                    <span className={`result-badge ${r.status}`}>{r.status}</span>
                    <span className="result-email">{r.email}</span>
                    {r.status === "success" && <span className="level-chip">{r.level}</span>}
                    {r.reason && <span className="result-reason">{r.reason}</span>}
                  </div>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleReset}>
                  <span>Upload Another File</span>
                </button>
                <button className="btn-secondary" onClick={() => navigate("/dashboard/teacher")}>
                  Back to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}