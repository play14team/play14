"use client"

import { useEffect, useState } from "react"
import { buildIssueReportUrl, issueReportContextFromError } from "@/libs/issue-report"

/**
 * Builds a GitHub issue-report URL pre-filled with the captured error and the
 * current page context. The work happens in a `useEffect` because
 * `window.location` and `navigator.userAgent` aren't available during SSR —
 * so the link briefly appears after hydration, which is intentional.
 * `useMemo` won't work here for the same reason.
 */
export function useIssueReportUrl(error: (Error & { digest?: string }) | undefined): string | null {
  const [issueUrl, setIssueUrl] = useState<string | null>(null)

  // [error] is a stable reference per render of an error boundary — Next.js
  // hands the same Error instance on every re-render until reset() runs.
  useEffect(() => {
    if (!error) {
      setIssueUrl(null)
      return
    }
    setIssueUrl(buildIssueReportUrl(issueReportContextFromError(error, window.location, navigator)))
  }, [error])

  return issueUrl
}
