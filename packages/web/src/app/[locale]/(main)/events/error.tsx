"use client" // Error components must be Client Components

import { useTranslations } from "next-intl"
import ErrorMessage from "@/components/layout/error-message"
import Page from "@/components/layout/page"
import { useChunkErrorRecovery } from "@/hooks/use-chunk-error-recovery"
import { isConnectionError } from "@/libs/connection-error"

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  const t = useTranslations("events")
  const reloading = useChunkErrorRecovery(error)

  if (reloading) {
    // Stale chunk after a deploy — a full reload is in flight; avoid flashing an error.
    return (
      <Page name={t("title")}>
        <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} aria-hidden="true" />
        </div>
      </Page>
    )
  }

  const connectionError = isConnectionError(error)

  return (
    <Page name={t("title")}>
      <ErrorMessage
        title={connectionError ? t("errorUnableToLoad") : t("errorLoading")}
        message={connectionError ? t("errorConnection") : error.message || t("errorGeneric")}
        details={
          process.env.NODE_ENV === "development"
            ? `${error.message}\n${error.stack || ""}`
            : undefined
        }
        onRetry={reset}
        // Suppress the report link on connection errors — those aren't bugs to file.
        error={connectionError ? undefined : error}
      />
    </Page>
  )
}
