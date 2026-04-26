/**
 * Thin wrapper around `strapi.plugin("email").service("email").send(...)`
 * that emits a uniform log line for every outbound transactional email.
 *
 * Why a helper instead of an inline `strapi.log.info` per call site:
 *   - One place to change the format.
 *   - Impossible to forget on a new send path — TypeScript forces a `type`.
 *   - Gives operators a single grep target (`[Email] Sending`) covering every
 *     transactional flow (confirmations, invitations, claims, reminders, …).
 *
 * The log is emitted BEFORE the underlying send so a hang or thrown error
 * still leaves a trace of the intent. The post-send detailed logs in each
 * caller (durations, metrics, correlation IDs) stay where they are.
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

function formatRecipients(to: string | string[]): string {
  return Array.isArray(to) ? to.join(", ") : to
}

/**
 * Send a transactional email and log a uniform `[Email] Sending …` line.
 *
 * Errors propagate to the caller — adding a try/catch here would hide
 * failures from caller-specific metrics (emailSendTotal counter, etc.).
 */
export async function sendEmail(
  strapi: Core.Strapi,
  type: EmailType,
  options: EmailSendOptions
): Promise<unknown> {
  strapi.log.info(`[Email] Sending ${type} email to ${formatRecipients(options.to)}`)
  return strapi.plugin("email").service("email").send(options)
}
