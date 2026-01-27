/**
 * Migration: Fix player visible null values
 *
 * Sets visible = true for any players with null or false visible values.
 * The visible field defaults to true in the schema, but existing records
 * created before the field was added may have null values.
 */

export async function up(knex) {
  console.log("Starting migration: Fix player visible null values")

  const hasTable = await knex.schema.hasTable("players")
  if (!hasTable) {
    console.log("players table does not exist, skipping migration")
    return
  }

  const hasColumn = await knex.schema.hasColumn("players", "visible")
  if (!hasColumn) {
    console.log("players.visible column does not exist, skipping migration")
    return
  }

  // Update null visible values to true
  const updated = await knex("players")
    .where(function () {
      this.whereNull("visible").orWhere("visible", false)
    })
    .update({ visible: true })

  console.log(`Updated ${updated} player(s) with visible = true`)
}

export async function down() {
  console.log("Rollback skipped: data fix is non-destructive and not safely reversible")
}
