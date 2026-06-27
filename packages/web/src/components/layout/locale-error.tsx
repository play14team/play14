"use client"

import { useTranslations } from "next-intl"
import ErrorMessage from "@/components/layout/error-message"
import Loader from "@/components/layout/loader"
import { useChunkErrorRecovery } from "@/hooks/use-chunk-error-recovery"
import { isConnectionError } from "@/libs/connection-error"

interface Props {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}

/**
 * Shared body for the locale-level error boundaries — (main) and (admin), which
 * were otherwise near-identical. Auto-reloads on a stale-chunk error after a
 * deploy; otherwise shows the styled #play14 error UI, with a connection-error
 * variant (suppresses the bug-report link for network blips).
 */
export default function LocaleError({ error, reset }: Props) {
  const t = useTranslations("common")
  const reloading = useChunkErrorRecovery(error)

  if (reloading) {
    // Stale chunk after a deploy — a full reload is in flight; avoid flashing an error.
    return (
      <div className="pt-70">
        <Loader />
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
