"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

/**
 * Global error boundary that catches errors in the root layout.
 * This is a fallback for errors that escape all other error boundaries.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report the error to Sentry
    Sentry.captureException(error)
    // Also log to console for debugging
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#f5f5f5",
            color: "#333",
          }}
        >
          <h1 style={{ marginBottom: "1rem", fontSize: "2rem" }}>Something went wrong</h1>
          <p
            style={{
              marginBottom: "2rem",
              color: "#666",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            An unexpected error occurred. Our team has been notified and is working to fix it.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0060df")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0070f3")}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.75rem",
                color: "#999",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
