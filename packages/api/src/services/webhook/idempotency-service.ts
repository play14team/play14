/**
 * Webhook Idempotency Service
 *
 * Ensures webhook events are processed exactly once by tracking
 * processed event IDs in the database with atomic operations.
 */

import type { Core } from "@strapi/strapi"

export interface IdempotencyResult {
  shouldProcess: boolean
  alreadyProcessed: boolean
  status?: "processing" | "completed" | "failed"
}

/**
 * Attempt to claim a webhook event for processing.
 * Uses atomic INSERT with unique constraint to prevent race conditions.
 *
 * @returns shouldProcess: true if this instance should process the event
 */
export async function claimWebhookEvent(
  strapi: Core.Strapi,
  eventId: string,
  eventType: string,
  provider: "stripe" = "stripe"
): Promise<IdempotencyResult> {
  const knex = strapi.db.connection

  try {
    // Try to insert a new record - will fail if eventId already exists (unique constraint)
    await knex("processed_webhooks").insert({
      document_id: crypto.randomUUID(),
      event_id: eventId,
      event_type: eventType,
      provider,
      status: "processing",
      created_at: new Date(),
      updated_at: new Date(),
    })

    strapi.log.info(`[Idempotency] Claimed event ${eventId} for processing`)
    return { shouldProcess: true, alreadyProcessed: false }
  } catch (error: any) {
    // Check if this is a unique constraint violation
    const isUniqueViolation =
      error.code === "23505" || // PostgreSQL
      error.code === "SQLITE_CONSTRAINT" || // SQLite
      error.message?.includes("UNIQUE constraint") ||
      error.message?.includes("duplicate key")

    if (isUniqueViolation) {
      // Event already exists - check its status
      const existing = await knex("processed_webhooks").where("event_id", eventId).first()

      if (existing) {
        strapi.log.info(`[Idempotency] Event ${eventId} already ${existing.status} - skipping`)
        return {
          shouldProcess: false,
          alreadyProcessed: true,
          status: existing.status,
        }
      }
    }

    // Some other error - let it bubble up
    throw error
  }
}

/**
 * Mark a webhook event as successfully processed.
 */
export async function markWebhookCompleted(
  strapi: Core.Strapi,
  eventId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const knex = strapi.db.connection

  await knex("processed_webhooks")
    .where("event_id", eventId)
    .update({
      status: "completed",
      processed_at: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
      updated_at: new Date(),
    })

  strapi.log.info(`[Idempotency] Event ${eventId} marked as completed`)
}

/**
 * Mark a webhook event as failed.
 * This allows the event to be retried by Stripe.
 */
export async function markWebhookFailed(
  strapi: Core.Strapi,
  eventId: string,
  errorMessage?: string
): Promise<void> {
  const knex = strapi.db.connection

  await knex("processed_webhooks")
    .where("event_id", eventId)
    .update({
      status: "failed",
      metadata: JSON.stringify({ error: errorMessage }),
      updated_at: new Date(),
    })

  strapi.log.info(`[Idempotency] Event ${eventId} marked as failed`)
}

/**
 * Release a webhook event claim (delete the record).
 * Use this when you want Stripe to retry the webhook.
 */
export async function releaseWebhookClaim(strapi: Core.Strapi, eventId: string): Promise<void> {
  const knex = strapi.db.connection

  await knex("processed_webhooks").where("event_id", eventId).delete()

  strapi.log.info(`[Idempotency] Event ${eventId} claim released for retry`)
}

/**
 * Clean up old processed webhook records.
 * Call this periodically to prevent table bloat.
 *
 * @param olderThanDays Delete records older than this many days (default: 7)
 */
export async function cleanupOldWebhookRecords(
  strapi: Core.Strapi,
  olderThanDays = 7
): Promise<number> {
  const knex = strapi.db.connection
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const deletedCount = await knex("processed_webhooks")
    .where("created_at", "<", cutoffDate)
    .where("status", "completed")
    .delete()

  if (deletedCount > 0) {
    strapi.log.info(`[Idempotency] Cleaned up ${deletedCount} old webhook records`)
  }

  return deletedCount
}
