/**
 * Thin wrapper around `strapi.plugin("email").service("email").send(...)`.
 * Emits a uniform `[Email] Sending …` log line and persists an `email-log`
 * row (success or failure) so operators can audit outbound mail for 90 days.
 *
 * Persistence is best-effort: a DB failure when writing the audit log must
 * not mask the provider's result, and any provider error must keep
 * propagating to the caller (their emailSendTotal counter / alerts depend
 * on it). The log line is emitted BEFORE the send so a hang still leaves a
 * trace of intent.
 *
 * Trade-offs to revisit if volume grows:
 *  - One synchronous DB write per send (~1-2ms on a healthy PG). At current
 *    volume this is in the noise; profile here before batching/async-queuing.
 *  - bcc + raw bodies are stored verbatim. Anyone with admin-UI read access
 *    to the `email-log` collection can see them. Acceptable for ops review
 *    but worth weighing against GDPR data minimisation if retention grows
 *    past 90 days — consider redacting bcc / hashing recipient addresses.
 */

import type { Core } from "@strapi/strapi"

export type EmailType =
  | "confirmation"
  | "ticket_sold"
  | "player_invitation"
  | "payment_failed"
  | "stripe_account_status"
  | "event_cancelled"
  | "user_invitation"
  | "event_results_reminder"
  | "attendance_claim_request"
  | "attendance_claim_decision"
  | "player_claim_request"
  | "player_claim_decision"
  | "password_reset"
  | "ticket_refund"

interface EmailSendOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

interface EmailSendExtras {
  context?: Record<string, unknown>
}

interface EmailLogData {
  to: string
  cc?: string
  bcc?: string
  fromAddress?: string
  replyTo?: string
  subject: string
  emailType: EmailType
  emailStatus: "sent" | "failed"
  errorMessage?: string
  providerMessageId?: string
  bodyHtml?: string
  bodyText?: string
  attachmentNames?: string[]
  context?: Record<string, unknown>
  sentAt: string
}

function formatRecipients(to: string | string[] | undefined): string | undefined {
  if (to === undefined) return undefined
  return Array.isArray(to) ? to.join(", ") : to
}

// Cap audit-log bodies so a pathological email (or a runaway template loop)
// can't bloat the table. 256 KB preserves every real transactional email
// we send today while bounding worst-case storage to ~22 GB over 90 days at
// 1k emails/day.
const MAX_BODY_BYTES = 256 * 1024

function truncateBody(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  if (Buffer.byteLength(value, "utf8") <= MAX_BODY_BYTES) return value
  const marker = `\n…[truncated at ${MAX_BODY_BYTES} bytes]`
  const markerBytes = Buffer.byteLength(marker, "utf8")
  // Byte-aware slice; toString() drops any trailing partial UTF-8 sequence.
  const head = Buffer.from(value, "utf8")
    .subarray(0, MAX_BODY_BYTES - markerBytes)
    .toString("utf8")
  return head + marker
}

// Sender.net's response shape isn't a stable contract; look in a few
// plausible places and silently fall back to undefined.
function extractProviderMessageId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined
  const obj = result as {
    id?: unknown
    message_id?: unknown
    messageId?: unknown
    data?: { id?: unknown }
  }
  const candidates = [obj.id, obj.message_id, obj.messageId, obj.data?.id]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate.slice(0, 500)
    }
    if (typeof candidate === "number") {
      return String(candidate)
    }
  }
  return undefined
}

async function persistEmailLog(
  strapi: Core.Strapi,
  args: {
    type: EmailType
    options: EmailSendOptions
    emailStatus: "sent" | "failed"
    sentAt: Date
    providerMessageId?: string
    errorMessage?: string
    context?: Record<string, unknown>
  }
): Promise<void> {
  const recipient = formatRecipients(args.options.to)
  if (!recipient) {
    strapi.log.warn(`[Email] Skipping audit log: no recipient on ${args.type} email`)
    return
  }

  const data: EmailLogData = {
    to: recipient,
    cc: formatRecipients(args.options.cc),
    bcc: formatRecipients(args.options.bcc),
    fromAddress: args.options.from,
    replyTo: args.options.replyTo,
    subject: args.options.subject,
    emailType: args.type,
    emailStatus: args.emailStatus,
    errorMessage: args.errorMessage,
    providerMessageId: args.providerMessageId,
    bodyHtml: truncateBody(args.options.html),
    bodyText: truncateBody(args.options.text),
    attachmentNames: args.options.attachments?.map((a) => a.filename),
    context: args.context,
    sentAt: args.sentAt.toISOString(),
  }

  try {
    // TODO: drop the `as never` casts once `bun --filter play14-api build`
    // regenerates Strapi's content-type types to include `email-log`. The
    // `data` shape is fully typed via EmailLogData above.
    await strapi.documents("api::email-log.email-log" as never).create({ data } as never)
  } catch (logError) {
    const message = logError instanceof Error ? logError.message : String(logError)
    strapi.log.warn(`[Email] Failed to persist email-log row (${args.emailStatus}): ${message}`)
  }
}

export async function sendEmail(
  strapi: Core.Strapi,
  type: EmailType,
  options: EmailSendOptions,
  extras: EmailSendExtras = {}
): Promise<unknown> {
  strapi.log.info(`[Email] Sending ${type} email to ${formatRecipients(options.to)}`)
  // Captured before the provider call so a slow send doesn't skew the
  // audit timestamp from when the email actually left our system.
  const sentAt = new Date()

  try {
    const result = await strapi.plugin("email").service("email").send(options)
    await persistEmailLog(strapi, {
      type,
      options,
      emailStatus: "sent",
      sentAt,
      providerMessageId: extractProviderMessageId(result),
      context: extras.context,
    })
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await persistEmailLog(strapi, {
      type,
      options,
      emailStatus: "failed",
      sentAt,
      errorMessage,
      context: extras.context,
    })
    throw error
  }
}
