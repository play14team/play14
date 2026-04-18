/**
 * Cron task for reconciling stuck newsletter sends.
 *
 * A newsletter can get stuck in sendStatus === "sending" if the process
 * crashes between `POST /v2/campaigns` (create) and
 * `POST /v2/campaigns/{id}/send` (dispatch). This job polls Sender.net to
 * resolve the true state of those campaigns and updates the DB accordingly.
 *
 * Decision matrix (see `decideReconciliation`):
 *   - status === "SENT" OR a `sent_time` is populated → mark as sent.
 *   - status in {SENDING, QUEUED, PROCESSING}         → keep waiting (noop).
 *   - 404                                              → mark as failed.
 *   - any other status / missing campaign id           → mark as failed.
 */

import type { Core } from "@strapi/strapi"
import { fetchWithTimeout, safeJson } from "../sender-common"

const DEFAULT_STALE_MS = 300_000

type SendStatus = "draft" | "sending" | "sent" | "failed"

interface NewsletterForReconciliation {
  documentId: string
  subject: string
  sendStatus: SendStatus
  resendBroadcastId: string | null
  updatedAt: string
}

interface CampaignFetchResult {
  httpStatus: number
  body: unknown
}

export interface SenderCampaignStatusBody {
  data?: {
    id?: string
    status?: string
    sent_time?: string | null
  }
  // Some error shapes may surface at top-level
  status?: string
  sent_time?: string | null
  message?: string
}

export interface ReconciliationDecision {
  action: "mark-sent" | "mark-failed" | "wait"
  sendStatus?: "sent" | "failed"
  sentAt?: string
  errorMessage?: string
}

/**
 * Pure decision helper — factored out so the cron can be unit tested without
 * touching Strapi / fetch. `now` is injected for deterministic tests.
 */
export function decideReconciliation(
  result: CampaignFetchResult | { missingCampaignId: true },
  now: Date = new Date()
): ReconciliationDecision {
  if ("missingCampaignId" in result) {
    return {
      action: "mark-failed",
      sendStatus: "failed",
      errorMessage: "stuck in sending without campaign id",
    }
  }

  const { httpStatus, body } = result

  if (httpStatus === 404) {
    return {
      action: "mark-failed",
      sendStatus: "failed",
      errorMessage: "Sender.net campaign not found (404)",
    }
  }

  // Non-2xx responses that aren't 404 — treat as transient and keep waiting
  // so the next cron tick can retry. (The record stays in "sending" and is
  // already older than the stale threshold, so it will be re-checked.)
  if (httpStatus < 200 || httpStatus >= 300) {
    return {
      action: "wait",
    }
  }

  const data =
    body && typeof body === "object" && "data" in (body as object)
      ? ((body as SenderCampaignStatusBody).data ?? {})
      : ((body ?? {}) as SenderCampaignStatusBody)

  const status = typeof data.status === "string" ? data.status.toUpperCase() : undefined
  const sentTime = typeof data.sent_time === "string" && data.sent_time ? data.sent_time : undefined

  if (status === "SENT" || sentTime) {
    return {
      action: "mark-sent",
      sendStatus: "sent",
      sentAt: sentTime ?? now.toISOString(),
    }
  }

  if (status && ["SENDING", "QUEUED", "PROCESSING"].includes(status)) {
    return { action: "wait" }
  }

  return {
    action: "mark-failed",
    sendStatus: "failed",
    errorMessage: status
      ? `Sender.net campaign in unexpected status: ${status}`
      : "Sender.net campaign status unavailable",
  }
}

async function fetchCampaignStatus(
  apiKey: string,
  campaignId: string
): Promise<CampaignFetchResult> {
  const response = await fetchWithTimeout(`https://api.sender.net/v2/campaigns/${campaignId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  })
  const body = await safeJson(response)
  return { httpStatus: response.status, body }
}

/**
 * Reconcile newsletters that have been stuck in "sending" longer than the
 * configured stale threshold.
 */
export async function reconcileNewsletterSends(strapi: Core.Strapi): Promise<void> {
  if (process.env.NEWSLETTER_RECONCILE_ENABLED === "false") {
    return
  }

  const apiKey = process.env.SENDER_API_KEY
  if (!apiKey) {
    strapi.log.warn("[NewsletterReconcile] SENDER_API_KEY not configured; skipping reconciliation")
    return
  }

  const staleMs = Number.parseInt(
    process.env.NEWSLETTER_RECONCILE_STALE_MS || String(DEFAULT_STALE_MS),
    10
  )
  const resolvedStale = Number.isFinite(staleMs) && staleMs > 0 ? staleMs : DEFAULT_STALE_MS

  const now = new Date()
  const cutoff = new Date(now.getTime() - resolvedStale)

  const stuck = (await strapi.documents("api::newsletter-send.newsletter-send").findMany({
    fields: ["documentId", "subject", "sendStatus", "resendBroadcastId", "updatedAt"],
    filters: {
      sendStatus: "sending",
      updatedAt: { $lt: cutoff.toISOString() },
    },
    sort: { updatedAt: "asc" },
  })) as unknown as NewsletterForReconciliation[]

  if (stuck.length === 0) {
    return
  }

  strapi.log.info(
    `[NewsletterReconcile] Found ${stuck.length} newsletter(s) stuck in sending for >${resolvedStale}ms`
  )

  let sentCount = 0
  let failedCount = 0
  let waitingCount = 0

  for (const newsletter of stuck) {
    try {
      let decision: ReconciliationDecision
      if (!newsletter.resendBroadcastId) {
        decision = decideReconciliation({ missingCampaignId: true }, now)
      } else {
        const campaignResult = await fetchCampaignStatus(apiKey, newsletter.resendBroadcastId)
        decision = decideReconciliation(campaignResult, now)
      }

      if (decision.action === "wait") {
        waitingCount++
        continue
      }

      if (decision.action === "mark-sent") {
        await strapi.documents("api::newsletter-send.newsletter-send").update({
          documentId: newsletter.documentId,
          data: {
            sendStatus: "sent",
            sentAt: decision.sentAt,
          } as any,
        })
        sentCount++
        strapi.log.info(
          `[NewsletterReconcile] Marked "${newsletter.subject}" (${newsletter.documentId}) as sent`
        )
        continue
      }

      // mark-failed
      await strapi.documents("api::newsletter-send.newsletter-send").update({
        documentId: newsletter.documentId,
        data: {
          sendStatus: "failed",
          errorMessage: decision.errorMessage,
        } as any,
      })
      failedCount++
      strapi.log.warn(
        `[NewsletterReconcile] Marked "${newsletter.subject}" (${newsletter.documentId}) as failed: ${decision.errorMessage}`
      )
    } catch (error) {
      strapi.log.error(
        `[NewsletterReconcile] Error reconciling "${newsletter.subject}" (${newsletter.documentId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      // Continue with the next stuck newsletter even if one fails.
    }
  }

  strapi.log.info(
    `[NewsletterReconcile] Completed: ${sentCount} marked sent, ${failedCount} marked failed, ${waitingCount} still waiting`
  )
}
