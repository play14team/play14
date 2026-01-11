"use strict";

/**
 * Migration: Backfill player visibility defaults
 *
 * Ensures existing players default to visible = true when the field is null.
 */

async function up(knex) {
  console.log("Starting migration: Backfill player visibility");

  const hasTable = await knex.schema.hasTable("players");
  if (!hasTable) {
    console.log("players table does not exist, skipping migration");
    return;
  }

  const hasColumn = await knex.schema.hasColumn("players", "visible");
  if (!hasColumn) {
    console.log("players.visible column does not exist, skipping migration");
    return;
  }

  const updated = await knex("players")
    .whereNull("visible")
    .update({ visible: true });

  console.log(`Updated ${updated} player(s) with visible = true`);
}

async function down() {
  console.log(
    "Rollback skipped: visibility backfill is non-destructive and not safely reversible"
  );
}

module.exports = { up, down };
