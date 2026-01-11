"use strict";

/**
 * Migration: Add unique index on event_id for processed_webhooks table
 *
 * This ensures webhook idempotency by preventing duplicate event processing.
 * Strapi's schema sync creates the column but not the unique constraint,
 * so we need to add it manually.
 */

async function up(knex) {
  console.log("Starting migration: Add processed_webhooks unique index");

  // Check if the table exists (it may not exist on first run before schema sync)
  const hasTable = await knex.schema.hasTable("processed_webhooks");
  if (!hasTable) {
    console.log(
      "processed_webhooks table does not exist yet, skipping migration (will be created by schema sync)"
    );
    return;
  }

  // Check if the index already exists using parameterized query
  const indexName = "processed_webhooks_event_id_unique";
  const indexExists = await knex("pg_indexes")
    .where("indexname", indexName)
    .first()
    .then((result) => !!result);

  if (!indexExists) {
    console.log("Creating unique index on event_id column");
    await knex.schema.raw(
      `CREATE UNIQUE INDEX processed_webhooks_event_id_unique ON processed_webhooks(event_id)`
    );
    console.log("Successfully created unique index");
  } else {
    console.log("Unique index already exists, skipping");
  }
}

async function down(knex) {
  console.log("Rolling back migration: Remove processed_webhooks unique index");

  const hasTable = await knex.schema.hasTable("processed_webhooks");
  if (!hasTable) {
    console.log("processed_webhooks table does not exist, skipping rollback");
    return;
  }

  const indexName = "processed_webhooks_event_id_unique";
  const indexExists = await knex("pg_indexes")
    .where("indexname", indexName)
    .first()
    .then((result) => !!result);

  if (indexExists) {
    console.log("Dropping unique index on event_id column");
    await knex.schema.raw(
      `DROP INDEX processed_webhooks_event_id_unique`
    );
    console.log("Successfully dropped unique index");
  } else {
    console.log("Unique index does not exist, skipping rollback");
  }
}

module.exports = { up, down };
