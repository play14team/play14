"use client" // Error components must be Client Components

import LocaleError from "@/components/layout/locale-error"

// Admin-section error boundary. Without this, errors under /admin bubble all the
// way up to global-error.tsx (a bare, unstyled fallback). This keeps them inside
// the locale layout so they render the styled #play14 error UI — and auto-reloads
// on a stale-chunk error after a deploy (shared logic in LocaleError).
export default function AdminError(props: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  return <LocaleError {...props} />
}
