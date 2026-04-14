"use client" // Error components must be Client Components

import { useTranslations } from "next-intl"
import { useEffect } from "react"
import ErrorMessage from "@/components/layout/error-message"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  const t = useTranslations("common")

  useEffect(() => {
    console.error(error)
  }, [error])

  // Detect connection errors
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
      />
    </div>
  )
}
