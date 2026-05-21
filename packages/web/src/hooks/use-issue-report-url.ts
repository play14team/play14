"use client"

import { useEffect, useState } from "react"
import { buildIssueReportUrl, issueReportContextFromError } from "@/libs/issue-report"

// useEffect, not useMemo: window/navigator aren't available during SSR, so the URL is set post-hydration.
export function useIssueReportUrl(error: (Error & { digest?: string }) | undefined): string | null {
  const [issueUrl, setIssueUrl] = useState<string | null>(null)

  // [error] is stable per boundary — Next.js hands the same Error instance until reset() runs.
  useEffect(() => {
    if (!error) {
      setIssueUrl(null)
      return
    }
    setIssueUrl(buildIssueReportUrl(issueReportContextFromError(error, window.location, navigator)))
  }, [error])

  return issueUrl
}
