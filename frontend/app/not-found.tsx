"use client";
export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "system-ui,sans-serif", padding: 24 }}>
      <h2 style={{ margin: 0, fontWeight: 800 }}>404 — Not found</h2>
      <a href="/" style={{ color: "#8a6d00", fontWeight: 700 }}>Back to GhostLend</a>
    </div>
  );
}
