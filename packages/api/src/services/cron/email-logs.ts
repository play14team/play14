// Bulk delete via Knex (no lifecycle hooks worth firing on audit rows);
// indexed on sent_at so this stays O(deleted), not O(table).

import type { Core } from "@strapi/strapi"

const DEFAULT_RETENTION_DAYS = 90

export async function cleanOldEmailLogs(
  strapi: Core.Strapi,
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<number> {
  const knex = strapi.db.connection
  // Epoch arithmetic — setDate() runs in local time and can shift by ±1h
  // across DST boundaries, which would silently change the retention window.
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  const deletedCount = await knex("email_logs").where("sent_at", "<", cutoff).delete()

  if (deletedCount > 0) {
    strapi.log.info(
      `[EmailLogs] Purged ${deletedCount} email-log rows older than ${retentionDays} days`
    )
  }

  return deletedCount
}
