/**
 * Migration: Rename 'status' field to 'eventStatus' in events table
 *
 * Reason: 'status' is a reserved word in Strapi 5 causing admin panel binding issues
 *
 * This migration:
 * 1. Renames the 'status' column to 'event_status' in the database
 * 2. Updates any existing data to use the new column name
 */

export async function up(knex) {
  console.log("Starting migration: Rename event status field")

  // Check if the events table exists first (for fresh database installations)
  const hasEventsTable = await knex.schema.hasTable("events")
  if (!hasEventsTable) {
    console.log(
      "Events table does not exist yet, skipping migration (will be created by schema sync)"
    )
    return
  }

  // Check if the 'status' column exists before renaming
  const hasStatusColumn = await knex.schema.hasColumn("events", "status")
  const hasEventStatusColumn = await knex.schema.hasColumn("events", "event_status")

  if (hasStatusColumn && !hasEventStatusColumn) {
    console.log("Renaming status column to event_status in events table")

    // Rename the column from 'status' to 'event_status'
    await knex.schema.alterTable("events", (table) => {
      table.renameColumn("status", "event_status")
    })

    console.log("Successfully renamed status column to event_status")
  } else if (hasEventStatusColumn) {
    console.log("Column event_status already exists, skipping migration")
  } else {
    console.log("Status column not found, creating event_status column")

    // Create the event_status column if neither exists
    await knex.schema.alterTable("events", (table) => {
      table
        .enu("event_status", ["Announced", "Open", "Over", "Cancelled"])
        .notNullable()
        .defaultTo("Announced")
    })
  }
}

export async function down(knex) {
  console.log("Rolling back migration: Rename event status field")

  // Check if the 'event_status' column exists before renaming back
  const hasEventStatusColumn = await knex.schema.hasColumn("events", "event_status")
  const hasStatusColumn = await knex.schema.hasColumn("events", "status")

  if (hasEventStatusColumn && !hasStatusColumn) {
    console.log("Renaming event_status column back to status in events table")

    // Rename the column back from 'event_status' to 'status'
    await knex.schema.alterTable("events", (table) => {
      table.renameColumn("event_status", "status")
    })

    console.log("Successfully renamed event_status column back to status")
  } else {
    console.log(
      "Cannot rollback: status column already exists or event_status column not found"
    )
  }
}
