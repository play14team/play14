/**
 * True for transient network/connection failures (the API server is unreachable),
 * as opposed to genuine application errors. Error boundaries use this to show a
 * "server unavailable" message and suppress the bug-report link — a dropped
 * connection isn't a bug to file.
 */
export function isConnectionError(error: unknown): boolean {
  const e = error as { message?: string; cause?: { code?: string } } | null | undefined
  const message = e?.message ?? ""
  return (
    message.includes("fetch failed") ||
    e?.cause?.code === "ECONNRESET" ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNABORTED")
  )
}
