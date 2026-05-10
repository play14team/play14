// Bulk delete via Knex (no lifecycle hooks worth firing on audit rows);
// indexed on sent_at so this stays O(deleted), not O(table).

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
