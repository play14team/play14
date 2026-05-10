/**
 * Migration: Rename 'status' field to 'webhookStatus' in processed_webhooks table
 *
 * Reason: 'status' is a reserved name in Strapi 5 — the admin UI conflated the
 * custom enum with the internal draft/publish state and would reject legitimate
 * values when editing records. Same fix as the prior `event.status -> eventStatus`
 * and `ticket-order.status -> orderStatus` renames. Even though processed_webhooks
 * is an internal idempotency table not normally edited from the admin UI, an
 * incident-recovery user trying to flip a `failed` row to `processing` would have
 * hit the same admin-validation error. Renamed pre-emptively for consistency
 * across content types.
 *
 * This migration is idempotent: safe to re-run if a previous attempt partially
 * completed.
 */

export async function up(knex) {
  console.log("Starting migration: Rename processed-webhook status field")

  await knex.transaction(async (trx) => {
    const hasTable = await trx.schema.hasTable("processed_webhooks")
    if (!hasTable) {
      console.log(
        "processed_webhooks table does not exist yet, skipping migration (will be created by schema sync)"
      )
      return
    }

    const hasStatusColumn = await trx.schema.hasColumn("processed_webhooks", "status")
    const hasWebhookStatusColumn = await trx.schema.hasColumn(
      "processed_webhooks",
      "webhook_status"
    )

    if (hasStatusColumn && !hasWebhookStatusColumn) {
      console.log("Renaming status column to webhook_status in processed_webhooks table")

      await trx.schema.alterTable("processed_webhooks", (table) => {
        table.renameColumn("status", "webhook_status")
      })

      console.log("Successfully renamed status column to webhook_status")
    } else if (hasWebhookStatusColumn) {
      console.log("Column webhook_status already exists, skipping migration")
    } else {
      console.log("Status column not found, creating webhook_status column")

      await trx.schema.alterTable("processed_webhooks", (table) => {
        table
          .enu("webhook_status", ["processing", "completed", "failed"])
          .notNullable()
          .defaultTo("processing")
      })
    }
  })
}

export async function down(knex) {
  console.log("Rolling back migration: Rename processed-webhook status field")

  await knex.transaction(async (trx) => {
    const hasWebhookStatusColumn = await trx.schema.hasColumn(
      "processed_webhooks",
      "webhook_status"
    )
    const hasStatusColumn = await trx.schema.hasColumn("processed_webhooks", "status")

    if (hasWebhookStatusColumn && !hasStatusColumn) {
      console.log("Renaming webhook_status column back to status in processed_webhooks table")

      await trx.schema.alterTable("processed_webhooks", (table) => {
        table.renameColumn("webhook_status", "status")
      })

      console.log("Successfully renamed webhook_status column back to status")
    } else {
      console.log(
        "Cannot rollback: status column already exists or webhook_status column not found"
      )
    }
  })
}
