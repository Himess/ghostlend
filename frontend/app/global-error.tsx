"use client";

// Custom global error boundary. Overriding Next's built-in /_global-error avoids the build-time
// "Expected workStore to be initialized" prerender invariant for this fully client-rendered dApp.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f3f1", color: "#1a1815" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
          <h2 style={{ margin: 0, fontWeight: 800 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: "#615d54", maxWidth: 420, textAlign: "center" }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: "11px 22px", borderRadius: 12, border: "1px solid rgba(0,0,0,.06)", background: "linear-gradient(180deg,#ffdf5c,#ffd208)", fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
