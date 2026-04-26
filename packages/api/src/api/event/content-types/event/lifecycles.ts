import { eventToSlug } from "../../../../libs/strings"
import { TABLES } from "../../../../libs/tables"
import { acquireLock, releaseLock } from "../../../../services/cron/distributed-lock"
import { sendEventCancellationEmails } from "../../../../services/email-templates"
import { triggerContentRevalidation } from "../../../../services/frontend-revalidation"

/**
 * Lifecycle hooks for Event content type
 * Migrated to Strapi 5 Document Service API
 * See: https://docs.strapi.io/dev-docs/api/document-service
 */

function validate(data: { name?: string; start?: string; slug?: string }) {
  if (!data?.name || !data.start) return
  const slug = eventToSlug(data.name, data.start)
  if (data.slug !== slug) {
    data.slug = slug
  }
}

/**
 * Fire cancellation emails the first time an event transitions to Cancelled.
 *
 * Idempotency is driven by `cancellationNotifiedAt`: once set, later updates
 * (admin tweaks a description, etc.) skip the send path. The timestamp is
 * written via raw Knex to bypass the lifecycle and avoid recursion. Work runs
 * fire-and-forget — any send failure is logged inside the service helper, not
 * re-thrown, so a flaky outbound call never blocks the admin update.
 *
 * A per-event Redis lock closes the remaining window where two Strapi
 * containers receiving the same afterUpdate concurrently could both start
 * dispatching before the timestamp is written. When Redis is not configured
 * (dev), acquireLock returns a fallback token so behaviour degrades to the
 * single-container case.
 */
export async function notifyEventCancellation(result: {
  documentId: string
  eventStatus?: string
  cancellationNotifiedAt?: string | null
}): Promise<void> {
  if (result.eventStatus !== "Cancelled" || result.cancellationNotifiedAt) return

  const lockName = `event-cancellation:${result.documentId}`
  const lockToken = await acquireLock(lockName, 5 * 60 * 1000)
  if (!lockToken) return

  try {
    const event = (await strapi.documents("api::event.event").findOne({
      documentId: result.documentId,
      fields: ["documentId", "name", "start", "cancellationNotifiedAt", "cancellationReason"],
      populate: {
        location: { fields: ["name", "country"] },
        venue: { fields: ["name", "location"] },
      },
    })) as unknown as {
      documentId: string
      name: string
      start: string
      cancellationNotifiedAt?: string | null
      cancellationReason?: string | null
      location?: { name?: string; country?: string } | null
      venue?: { name?: string; location?: { place_name?: string } | null } | null
    } | null

    if (!event) return
    // Re-check after fetch — guards against the same container racing itself
    // before the distributed lock was introduced, and against any window where
    // a peer completed its run while we were waiting for the lock to free.
    if (event.cancellationNotifiedAt) return

    await sendEventCancellationEmails(strapi, event)

    // Raw update to avoid re-entering afterUpdate.
    await strapi.db
      .connection(TABLES.events)
      .where("document_id", event.documentId)
      .update({ cancellation_notified_at: new Date(), updated_at: new Date() })
  } catch (error: any) {
    strapi.log.error(
      `[EventLifecycle] Event cancellation dispatch failed for ${result.documentId}: ${error.message}`
    )
  } finally {
    await releaseLock(lockName, lockToken)
  }
}

export default {
  beforeCreate(event: { params: { data: { name?: string; start?: string; slug?: string } } }) {
    const { data } = event.params
    validate(data)
  },
  beforeUpdate(event: { params: { data: { name?: string; start?: string; slug?: string } } }) {
    const { data } = event.params
    validate(data)
  },
  afterCreate(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "create")
  },
  afterUpdate(event: {
    result: {
      documentId: string
      slug?: string
      eventStatus?: string
      cancellationNotifiedAt?: string | null
    }
  }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "update")
    // Fire-and-forget: explicit `.catch` keeps an unhandled rejection from
    // crashing the Strapi process if the dispatch throws before the inner
    // try/catch can swallow it (e.g. acquireLock blowing up).
    notifyEventCancellation(event.result).catch((error: any) => {
      strapi.log.error(
        `[EventLifecycle] notifyEventCancellation failed for ${event.result.documentId}: ${error?.message ?? error}`
      )
    })
  },
  afterDelete(event: { result: { slug?: string } }) {
    triggerContentRevalidation(strapi, "api::event.event", event.result, "delete")
  },
}
