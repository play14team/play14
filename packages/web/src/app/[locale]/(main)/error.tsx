"use client" // Error components must be Client Components

import { useTranslations } from "next-intl"
import ErrorMessage from "@/components/layout/error-message"
import { useChunkErrorRecovery } from "@/hooks/use-chunk-error-recovery"
import { isConnectionError } from "@/libs/connection-error"

export default function Error({
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

  const connectionError = isConnectionError(error)

  return (
    <div className="pt-70">
      <ErrorMessage
        title={connectionError ? t("serverUnavailable") : t("error")}
        message={connectionError ? t("serverUnavailableDescription") : error.message || t("error")}
        details={
          process.env.NODE_ENV === "development"
            ? `${error.message}\n${error.stack || ""}`
            : undefined
        }
        retryLabel={t("tryAgain")}
        onRetry={reset}
        // Suppress the report link on connection errors — those aren't bugs to file.
        error={connectionError ? undefined : error}
      />
    </div>
  )
}
