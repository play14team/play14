"use client" // Error components must be Client Components

import { useTranslations } from "next-intl"
import ErrorMessage from "@/components/layout/error-message"
import { useChunkErrorRecovery } from "@/hooks/use-chunk-error-recovery"

// Admin-section error boundary. Without this, errors under /admin bubble all the
// way up to global-error.tsx (a bare, unstyled fallback). This keeps them inside
// the locale layout so they render the styled #play14 error UI — and auto-reloads
// on a stale-chunk error after a deploy.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  const t = useTranslations("common")
  const reloading = useChunkErrorRecovery(error)

  if (reloading) {
    // Stale chunk after a deploy — a full reload is in flight; avoid flashing an error.
    return (
      <div className="pt-70" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} aria-hidden="true" />
      </div>
    )
  }

  // Detect connection errors (mirrors the public (main) boundary)
  const isConnectionError =
    error.message.includes("fetch failed") ||
    error.cause?.code === "ECONNRESET" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ECONNABORTED")

  return (
    <div className="pt-70">
      <ErrorMessage
        title={isConnectionError ? t("serverUnavailable") : t("error")}
        message={
          isConnectionError ? t("serverUnavailableDescription") : error.message || t("error")
        }
        details={
          process.env.NODE_ENV === "development"
            ? `${error.message}\n${error.stack || ""}`
            : undefined
        }
        retryLabel={t("tryAgain")}
        onRetry={reset}
        // Suppress the report link on connection errors — those aren't bugs to file.
        error={isConnectionError ? undefined : error}
      />
    </div>
  )
}
