/**
 * Thin wrapper around `strapi.plugin("email").service("email").send(...)`
 * that emits a uniform log line for every outbound transactional email AND
 * persists an `email-log` row so operators can audit what was sent (and to
 * whom) for the past 90 days. Rows are pruned by the `cleanOldEmailLogs`
 * cron in `services/cron/email-logs.ts`.
 *
 * Why a helper instead of an inline `strapi.log.info` per call site:
 *   - One place to change the format.
 *   - Impossible to forget on a new send path — TypeScript forces a `type`.
 *   - Gives operators a single grep target (`[Email] Sending`) covering every
 *     transactional flow (confirmations, invitations, claims, reminders, …).
 *   - Single funnel for the audit log too — if every caller goes through
 *     here, the email-log table is guaranteed complete.
 *
 * The log is emitted BEFORE the underlying send so a hang or thrown error
 * still leaves a trace of the intent. The post-send detailed logs in each
 * caller (durations, metrics, correlation IDs) stay where they are.
 *
 * Audit-log persistence is best-effort: a DB failure when writing to
 * `email-log` must not mask the send result, and any error from the email
 * provider must keep propagating to the caller (their metrics + alert paths
 * depend on it).
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

/**
 * Optional extras callers can attach to the audit log without affecting the
 * outbound send payload. Useful for `{ orderId, eventId, playerId }` style
 * correlation IDs that aren't part of the email itself.
 */
interface EmailSendExtras {
  context?: Record<string, unknown>
}

function formatRecipients(to: string | string[] | undefined): string | undefined {
  if (to === undefined) return undefined
  return Array.isArray(to) ? to.join(", ") : to
}

/**
 * Best-effort extraction of a provider-side message ID from Sender.net's
 * response. The shape isn't documented as a stable contract, so we look in
 * a few plausible places and silently fall back to `undefined`. The audit
 * log treats this as optional metadata.
 */
function extractProviderMessageId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined
  const obj = result as Record<string, unknown>
  const candidates = [obj.id, obj.message_id, obj.messageId, (obj.data as any)?.id]
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
  data: {
    type: EmailType
    options: EmailSendOptions
    emailStatus: "sent" | "failed"
    providerMessageId?: string
    errorMessage?: string
    context?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await strapi.documents("api::email-log.email-log" as any).create({
      data: {
        to: formatRecipients(data.options.to) ?? "",
        cc: formatRecipients(data.options.cc),
        bcc: formatRecipients(data.options.bcc),
        fromAddress: data.options.from ?? "",
        replyTo: data.options.replyTo,
        subject: data.options.subject,
        emailType: data.type,
        emailStatus: data.emailStatus,
        errorMessage: data.errorMessage,
        providerMessageId: data.providerMessageId,
        bodyHtml: data.options.html,
        bodyText: data.options.text,
        attachmentNames: data.options.attachments?.map((a) => a.filename),
        context: data.context,
        sentAt: new Date().toISOString(),
      } as any,
    })
  } catch (logError) {
    const message = logError instanceof Error ? logError.message : String(logError)
    strapi.log.warn(`[Email] Failed to persist email-log row (${data.emailStatus}): ${message}`)
  }
}

/**
 * Send a transactional email, log a uniform `[Email] Sending …` line, and
 * persist an audit-log row (success or failure).
 *
 * Errors from the underlying provider propagate to the caller — adding a
 * try/catch that swallows them would hide failures from caller-specific
 * metrics (emailSendTotal counter, etc.).
 */
export async function sendEmail(
  strapi: Core.Strapi,
  type: EmailType,
  options: EmailSendOptions,
  extras: EmailSendExtras = {}
): Promise<unknown> {
  strapi.log.info(`[Email] Sending ${type} email to ${formatRecipients(options.to)}`)

  try {
    const result = await strapi.plugin("email").service("email").send(options)
    await persistEmailLog(strapi, {
      type,
      options,
      emailStatus: "sent",
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
      errorMessage,
      context: extras.context,
    })
    throw error
  }
}
