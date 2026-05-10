/**
 * Email-log retention.
 *
 * Every transactional email funnelled through `sendEmail()` (see
 * services/email-send.ts) persists an `email-log` row containing the
 * recipient, subject, body, status, and any provider error. We keep those
 * rows for 90 days so operators can audit "did the confirmation actually go
 * out?" or "why did this player never receive their invite?", then purge
 * them to prevent unbounded table growth (HTML bodies can be ~100KB each).
 *
 * Deletion goes through Knex rather than the Document Service so a bulk
 * purge stays cheap — there are no lifecycle hooks worth firing on an
 * audit-log row.
 */

import type { Core } from "@strapi/strapi"

const DEFAULT_RETENTION_DAYS = 90

export async function cleanOldEmailLogs(
  strapi: Core.Strapi,
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<number> {
  const knex = strapi.db.connection
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const deletedCount = await knex("email_logs").where("sent_at", "<", cutoff).delete()

  if (deletedCount > 0) {
    strapi.log.info(
      `[EmailLogs] Purged ${deletedCount} email-log rows older than ${retentionDays} days`
    )
  }

  return deletedCount
}
