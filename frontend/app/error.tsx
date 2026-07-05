"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "system-ui,sans-serif", padding: 24 }}>
      <h2 style={{ margin: 0, fontWeight: 800 }}>Something went wrong</h2>
      <button onClick={() => reset()} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(0,0,0,.06)", background: "#ffd208", fontWeight: 700, cursor: "pointer" }}>Try again</button>
    </div>
  );
}
