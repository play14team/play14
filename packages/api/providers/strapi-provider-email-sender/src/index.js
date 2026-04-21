const DEFAULT_FROM_NAME = "#play14 community"
const SENDER_API_URL = "https://api.sender.net/v2/message/send"
const DEFAULT_REQUEST_TIMEOUT_MS = 15000

/**
 * Resolve the per-request timeout. Mirrors fetchWithTimeout in
 * src/services/sender-common.ts so the transactional provider and the
 * broadcast/subscribers clients honour the same SENDER_TIMEOUT_MS override.
 */
function resolveTimeoutMs() {
  const parsed = Number.parseInt(process.env.SENDER_TIMEOUT_MS || "", 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return DEFAULT_REQUEST_TIMEOUT_MS
}

/**
 * Parse a "Name <email>" or plain "email" string into { email, name } for Sender.net API.
 * Sender.net requires from.name to always be present, so a default is used for plain emails.
 */
function parseEmailAddress(address) {
  const match = address.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { email: address.trim(), name: DEFAULT_FROM_NAME }
}

/**
 * Normalize a recipient value (string | string[]) into the shape Sender.net expects.
 * A plain string maps to a single `{ email }` object; an array maps to `[{ email }, ...]`.
 */
function toRecipients(value) {
  if (Array.isArray(value)) {
    return value.map((addr) => ({ email: addr }))
  }
  return { email: value }
}

/**
 * Map Strapi-style attachments to Sender.net's base64 attachment shape.
 *
 * NOTE: Sender.net's public documentation is ambiguous about attachments — the knowledge
 * base examples describe URL-based attachments (`{ "filename.pdf": "https://..." }`) while
 * the REST API appears to accept inline base64. We emit `{ name, content, content_type }`
 * per the shape commonly used by clients; revisit if Sender.net confirms another schema.
 * See https://help.sender.net/knowledgebase/api-documentation/ and https://api.sender.net.
 */
function toAttachments(attachments) {
  return attachments.map((attachment) => {
    const content = attachment.content
    const base64 =
      content && typeof content.toString === "function" ? content.toString("base64") : ""
    return {
      name: attachment.filename,
      content: base64,
      content_type: attachment.contentType,
    }
  })
}

/**
 * Detect Sender.net failures that will never succeed on retry — recipient is on the
 * suppression list (unsubscribed, hard-bounced, complained), email is malformed, etc.
 * Sender.net flags these as HTTP 400 with `type: "mailer"` in the response body. Used
 * by the cron job to stop retrying and mark the user as suppressed instead of logging
 * errors forever.
 */
function isPermanentSendError(statusCode, body) {
  if (statusCode !== 400) return false
  if (!body || typeof body !== "object") return false
  if (body.type !== "mailer") return false
  const message = typeof body.message === "string" ? body.message : ""
  return /suppress|unsubscrib|bounce|complaint|invalid/i.test(message)
}

/**
 * Safely parse a fetch response body, returning parsed JSON when possible or the raw text
 * otherwise. Guarantees we never throw inside the error-handling path of `send`.
 */
async function readResponseBody(response) {
  const raw = await response.text()
  if (!raw) {
    return ""
  }
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

module.exports = {
  init(providerOptions, settings) {
    return {
      async send(options) {
        const { from, to, replyTo, subject, text, html, attachments } = options

        const fromAddress = from || settings.defaultFrom || ""
        const parsedFrom = parseEmailAddress(fromAddress)

        const body = {
          from: parsedFrom,
          to: toRecipients(to),
          subject,
        }

        if (html) body.html = html
        if (text) body.text = text

        const replyToValue = replyTo || settings.defaultReplyTo
        if (replyToValue) {
          body.reply_to = toRecipients(replyToValue)
        }

        if (Array.isArray(attachments) && attachments.length > 0) {
          body.attachments = toAttachments(attachments)
        }

        const requestTimeoutMs = resolveTimeoutMs()
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

        let response
        try {
          response = await fetch(SENDER_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${providerOptions.apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          })
        } catch (error) {
          if (error && (error.name === "AbortError" || controller.signal.aborted)) {
            const timeoutError = new Error(
              `Sender.net request timed out after ${requestTimeoutMs}ms`
            )
            timeoutError.cause = error
            throw timeoutError
          }
          throw error
        } finally {
          clearTimeout(timeout)
        }

        if (!response.ok) {
          const responseBody = await readResponseBody(response)
          const bodySnippet =
            typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody)
          const error = new Error(`Sender.net API error (${response.status}): ${bodySnippet}`)
          error.statusCode = response.status
          error.responseBody = responseBody
          error.permanent = isPermanentSendError(response.status, responseBody)
          throw error
        }

        return response.json()
      },
    }
  },
}
