/**
 * Shared helpers for Sender.net HTTP integrations.
 *
 * Centralises three concerns that were previously duplicated / inconsistent
 * across sender-broadcast.ts and sender-subscribers.ts:
 *
 *  - parseFromAddress: understand both `"email"` and `"Name <email>"` formats
 *    for EMAIL_DEFAULT_FROM, with a sensible display-name fallback. Mirrors
 *    packages/api/providers/strapi-provider-email-sender/src/index.js so both
 *    transactional and broadcast paths agree on the parsed shape.
 *
 *  - safeJson: some Sender.net error responses are HTML (5xx proxy pages),
 *    so a blind `response.json()` throws. Callers want the error body
 *    either way, so we fall back to `{ _raw: <text> }`.
 *
 *  - fetchWithTimeout: the plain `fetch` has no default timeout, so a
 *    hanging Sender.net request could wedge the newsletter "sending"
 *    state forever. 15s default, override via SENDER_TIMEOUT_MS.
 */

const DEFAULT_FROM_NAME = "#play14 community"
const DEFAULT_FROM_EMAIL = "noreply@play14.org"
const DEFAULT_TIMEOUT_MS = 15_000

export interface ParsedFromAddress {
  email: string
  name: string
}

/**
 * Parse the configured sender from EMAIL_DEFAULT_FROM into { email, name }.
 *
 * Accepted formats for EMAIL_DEFAULT_FROM:
 *   - "alice@example.com"                 → name falls back to
 *                                            EMAIL_DEFAULT_FROM_NAME or
 *                                            "#play14 community".
 *   - "Alice Example <alice@example.com>" → name is taken from the
 *                                            bracketed prefix.
 *
 * This intentionally mirrors parseEmailAddress in
 * packages/api/providers/strapi-provider-email-sender/src/index.js so the
 * transactional provider and the broadcast API stay in sync.
 */
export function parseFromAddress(): ParsedFromAddress {
  const raw = (process.env.EMAIL_DEFAULT_FROM || DEFAULT_FROM_EMAIL).trim()
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  const name = (process.env.EMAIL_DEFAULT_FROM_NAME || DEFAULT_FROM_NAME).trim()
  return { email: raw, name: name || DEFAULT_FROM_NAME }
}

/**
 * Read a fetch Response body as JSON, falling back to a `{ _raw: text }`
 * envelope when the body is not valid JSON. Never throws.
 */
export async function safeJson(response: Response): Promise<unknown> {
  try {
    // Clone so callers can still read the body if they want the raw text
    // on the same Response instance. (Body streams are one-shot.)
    return await response.clone().json()
  } catch {
    try {
      const text = await response.text()
      return { _raw: text }
    } catch {
      return { _raw: "" }
    }
  }
}

/**
 * Raised by `fetchWithTimeout` when the request exceeds its timeout.
 *
 * Callers branch on `instanceof SenderTimeoutError` — keep the class stable
 * even if the human-readable message changes.
 */
export class SenderTimeoutError extends Error {
  constructor(message = "Sender.net request timed out") {
    super(message)
    this.name = "SenderTimeoutError"
  }
}

/**
 * `fetch` with a configurable AbortController timeout.
 *
 * On timeout, rejects with a `SenderTimeoutError` so callers can detect it
 * without string-matching the message.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs?: number
): Promise<Response> {
  const envOverride = Number.parseInt(process.env.SENDER_TIMEOUT_MS || "", 10)
  const resolvedTimeout =
    timeoutMs ??
    (Number.isFinite(envOverride) && envOverride > 0 ? envOverride : DEFAULT_TIMEOUT_MS)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), resolvedTimeout)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || (error as { code?: string }).code === "ABORT_ERR")
    ) {
      throw new SenderTimeoutError()
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
