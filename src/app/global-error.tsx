"use client";

/**
 * Last-resort error page for errors in the root layout itself (everything else is caught by the
 * closer error.tsx boundaries). Must render its own <html> and <body>. In production the error
 * message is replaced by Next.js with a generic one; `digest` links it to the server logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <main style={{ textAlign: "center", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#64748b" }}>
            Please try again.{error.digest ? ` (Reference: ${error.digest})` : ""}
          </p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
