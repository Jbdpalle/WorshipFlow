"use client";

// Last resort: the root layout itself failed, so no app styles are loaded.
// Plain inline styles, plain words, one button.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          background: "#f3f0ea",
          color: "#1e2420",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>WorshipFlow ran into a problem</h1>
        <p style={{ maxWidth: 360, margin: 0, color: "#596158" }}>
          Nothing you saved was lost. Try again, and if it keeps happening, reload the page.
        </p>
        <button
          onClick={() => retry()}
          style={{
            minHeight: 44,
            padding: "0 20px",
            borderRadius: 8,
            border: 0,
            background: "#2c4a3e",
            color: "#f7f5f0",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
