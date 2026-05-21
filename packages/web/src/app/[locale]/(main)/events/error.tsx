"use client" // Error components must be Client Components

import { useTranslations } from "next-intl"
import { useEffect } from "react"
import ErrorMessage from "@/components/layout/error-message"
import Page from "@/components/layout/page"

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Events page error:", error)
  }, [error])

  const t = useTranslations("events")

  // Detect connection errors
  const isConnectionError =
    error.message.includes("fetch failed") ||
    error.cause?.code === "ECONNRESET" ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ECONNABORTED")

  return (
    <Page name={t("title")}>
      <ErrorMessage
        title={isConnectionError ? t("errorUnableToLoad") : t("errorLoading")}
        message={isConnectionError ? t("errorConnection") : error.message || t("errorGeneric")}
        details={
          process.env.NODE_ENV === "development"
            ? `${error.message}\n${error.stack || ""}`
            : undefined
        }
        onRetry={reset}
        error={isConnectionError ? undefined : error}
      />
    </Page>
  )
}
