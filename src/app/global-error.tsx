"use client"

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void _error
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px", fontFamily: "system-ui, sans-serif", background: "#f7f7f7" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>Something went wrong</h2>
          <p style={{ fontSize: "14px", color: "#888", maxWidth: "400px", textAlign: "center" }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 16px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
