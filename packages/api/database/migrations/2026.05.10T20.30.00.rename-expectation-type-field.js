/**
 * Migration: Rename 'type' field to 'expectationType' in expectations table
 *
 * Reason: 'type' is on the Strapi 5 reserved-name list (pitfall #10 in
 * packages/api/CLAUDE.md). Strapi reserves 'type' for component discriminators
 * inside dynamic zones; while expectation is a content type rather than a
 * component, the name still creates ambiguity in admin tooling. Renamed
 * pre-emptively for consistency with the eventStatus / orderStatus /
 * webhookStatus pattern adopted across the rest of the schema.
 *
 * Note: the locale-specific column might be `type` directly OR may be split
 * across i18n localization tables — Strapi handles localized columns on the
 * primary table for non-relational localized fields. Check both forms.
 *
 * This migration is idempotent: safe to re-run if a previous attempt partially
 * completed.
 */

export async function up(knex) {
  console.log("Starting migration: Rename expectation type field")

  await knex.transaction(async (trx) => {
    const hasTable = await trx.schema.hasTable("expectations")
    if (!hasTable) {
      console.log(
        "expectations table does not exist yet, skipping migration (will be created by schema sync)"
      )
      return
    }

    const hasTypeColumn = await trx.schema.hasColumn("expectations", "type")
    const hasExpectationTypeColumn = await trx.schema.hasColumn("expectations", "expectation_type")

    if (hasTypeColumn && !hasExpectationTypeColumn) {
      console.log("Renaming type column to expectation_type in expectations table")

      await trx.schema.alterTable("expectations", (table) => {
        table.renameColumn("type", "expectation_type")
      })

      console.log("Successfully renamed type column to expectation_type")
    } else if (hasExpectationTypeColumn) {
      console.log("Column expectation_type already exists, skipping migration")
    } else {
      console.log("Type column not found, creating expectation_type column")

      await trx.schema.alterTable("expectations", (table) => {
        table.enu("expectation_type", ["Main", "Secondary"]).notNullable()
      })
    }
  })
}

export async function down(knex) {
  console.log("Rolling back migration: Rename expectation type field")

  await knex.transaction(async (trx) => {
    const hasExpectationTypeColumn = await trx.schema.hasColumn("expectations", "expectation_type")
    const hasTypeColumn = await trx.schema.hasColumn("expectations", "type")

    if (hasExpectationTypeColumn && !hasTypeColumn) {
      console.log("Renaming expectation_type column back to type in expectations table")

      await trx.schema.alterTable("expectations", (table) => {
        table.renameColumn("expectation_type", "type")
      })

      console.log("Successfully renamed expectation_type column back to type")
    } else {
      console.log(
        "Cannot rollback: type column already exists or expectation_type column not found"
      )
    }
  })
}
