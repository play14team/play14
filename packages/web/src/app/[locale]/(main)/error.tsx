"use client" // Error components must be Client Components

import LocaleError from "@/components/layout/locale-error"

export default function Error(props: {
  error: Error & { digest?: string; cause?: Error & { code?: string } }
  reset: () => void
}) {
  return <LocaleError {...props} />
}
