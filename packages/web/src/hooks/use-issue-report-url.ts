"use client"

import { useEffect, useState } from "react"
import { buildIssueReportUrl, issueReportContextFromError } from "@/libs/issue-report"

// useEffect, not useMemo: window/navigator aren't available during SSR, so the URL is set post-hydration.
export function useIssueReportUrl(error: (Error & { digest?: string }) | undefined): string | null {
  const [issueUrl, setIssueUrl] = useState<string | null>(null)

  // New Error reference → re-derive the URL; same reference → no-op. Correct in either case.
  useEffect(() => {
    if (!error) {
      setIssueUrl(null)
      return
    }
    setIssueUrl(buildIssueReportUrl(issueReportContextFromError(error, window.location, navigator)))
  }, [error])

  return issueUrl
}
