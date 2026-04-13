export default function TestSuccess() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "monospace", background: "#f0fff0", gap: 12
    }}>
      <div style={{ fontSize: "3rem" }}>✅</div>
      <h2 style={{ fontSize: "1.3rem", color: "#2a7a2a" }}>Login worked!</h2>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>Supabase auth + navigation is functioning correctly.</p>
    </div>
  );
}