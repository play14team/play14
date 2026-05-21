"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { buildIssueReportUrl } from "@/libs/issue-report"

interface ErrorMessageProps {
  title?: string
  message: string
  details?: string
  showReload?: boolean
  retryLabel?: string
  onRetry?: () => void
  error?: Error & { digest?: string }
}

export default function ErrorMessage({
  title = "Something went wrong",
  message,
  details,
  showReload = true,
  retryLabel = "Retry",
  onRetry,
  error,
}: ErrorMessageProps) {
  const t = useTranslations("common")
  const [issueUrl, setIssueUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!error) {
      setIssueUrl(null)
      return
    }
    setIssueUrl(
      buildIssueReportUrl({
        errorMessage: error.message,
        errorDigest: error.digest,
        errorStack: error.stack,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      })
    )
  }, [error])

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="container py-5">
      <div
        className="error-alert"
        role="alert"
        style={{
          padding: "1.5rem",
          borderRadius: "8px",
          backgroundColor: "var(--color-bg-elevated)",
          border: "1px solid var(--color-red)",
        }}
      >
        <h4 style={{ color: "var(--color-red)", marginBottom: "0.75rem" }}>{title}</h4>
        <p style={{ color: "var(--color-text)", marginBottom: "1rem" }}>{message}</p>
        {details && (
          <div style={{ color: "var(--color-text-secondary)" }}>
            <pre
              style={{
                margin: 0,
                fontSize: "0.875rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {details}
            </pre>
          </div>
        )}
        {(showReload || issueUrl) && (
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {showReload && (
              <button type="button" className="btn btn-primary" onClick={handleRetry}>
                {retryLabel}
              </button>
            )}
            {issueUrl && (
              <a
                href={issueUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${t("reportThisIssue")} (opens in new tab)`}
                style={{ color: "var(--color-text-secondary)", textDecoration: "underline" }}
              >
                {t("reportThisIssue")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
