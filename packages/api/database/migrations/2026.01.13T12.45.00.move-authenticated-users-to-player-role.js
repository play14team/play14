"use strict";

/**
 * Migration: Move authenticated users to player role
 *
 * Ensures legacy users assigned to the "authenticated" role are migrated to "player".
 */

async function up(knex) {
  console.log("Starting migration: Move authenticated users to player role");

  const hasRoles = await knex.schema.hasTable("up_roles");
  const hasUsers = await knex.schema.hasTable("up_users");
  if (!hasRoles || !hasUsers) {
    console.log("Role/user tables missing, skipping migration");
    return;
  }

  const playerRole = await knex("up_roles")
    .select("id")
    .where({ type: "player" })
    .first();
  const authenticatedRole = await knex("up_roles")
    .select("id")
    .where({ type: "authenticated" })
    .first();

  if (!playerRole) {
    console.log("Player role not found, skipping migration");
    return;
  }
  if (!authenticatedRole) {
    console.log("Authenticated role not found, nothing to migrate");
    return;
  }

  let userColumnNames = [];
  try {
    const columnInfo = await knex("up_users").columnInfo();
    userColumnNames = Object.keys(columnInfo);
  } catch (error) {
    console.log("Unable to inspect up_users columns; falling back to schema checks");
  }

  const roleColumnCandidates = ["role_id", "role"];
  for (const roleColumn of roleColumnCandidates) {
    const hasRoleColumn = userColumnNames.length
      ? userColumnNames.includes(roleColumn)
      : await knex.schema.hasColumn("up_users", roleColumn);
    if (!hasRoleColumn) continue;
    try {
      const updated = await knex("up_users")
        .where({ [roleColumn]: authenticatedRole.id })
        .update({ [roleColumn]: playerRole.id });
      console.log(
        `Updated ${updated} user(s) to player role via up_users.${roleColumn}`
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Failed to update via up_users.${roleColumn}: ${message}`);
    }
  }

  const linkTableCandidates = [
    "up_users_role_lnk",
    "up_users_role_links",
    "up_users_roles_lnk",
    "up_users_roles_links",
  ];

  let linkTables = [];
  for (const table of linkTableCandidates) {
    if (await knex.schema.hasTable(table)) {
      linkTables.push(table);
    }
  }

  if (linkTables.length === 0) {
    try {
      const rows = await knex("information_schema.tables")
        .select("table_name")
        .where({ table_schema: "public" })
        .where("table_name", "like", "up_users_role%");
      linkTables = rows.map((row) => row.table_name);
    } catch (error) {
      console.log("Unable to inspect information_schema tables, skipping link table lookup");
    }
  }

  for (const table of linkTables) {
    const columns = await knex(table).columnInfo();
    const columnNames = Object.keys(columns);
    const roleColumn = columnNames.find(
      (name) => name.includes("role") && name.endsWith("_id")
    );
    if (!roleColumn) continue;

    const updated = await knex(table)
      .where({ [roleColumn]: authenticatedRole.id })
      .update({ [roleColumn]: playerRole.id });
    console.log(`Updated ${updated} user(s) to player role via ${table}.${roleColumn}`);
    return;
  }

  console.log("No role column or link table found; skipping user role migration");
}

async function down() {
  console.log(
    "Rollback skipped: role migration is not safely reversible without audit data"
  );
}

module.exports = { up, down };
