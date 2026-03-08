/**
 * Migration: Fix empty provider field on users
 *
 * Users created via the invite flow were missing provider: "local",
 * which prevents them from logging in with email/password.
 * Strapi's /auth/local endpoint requires provider === "local".
 */

export async function up(knex) {
  console.log("Starting migration: Fix empty user provider")

  const hasUsers = await knex.schema.hasTable("up_users")
  if (!hasUsers) {
    console.log("up_users table missing, skipping migration")
    return
  }

  const updated = await knex("up_users")
    .whereNull("provider")
    .orWhere("provider", "")
    .update({ provider: "local" })

  console.log(`Updated ${updated} user(s) with empty provider to "local"`)
}

export async function down() {
  console.log("Rollback skipped: cannot determine which users originally had empty provider")
}
