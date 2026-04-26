/**
 * Canonical Postgres table names for raw Knex queries that intentionally
 * bypass the Document Service (e.g. to avoid re-entering a lifecycle hook,
 * or to run a bulk `decrement`).
 *
 * These mirror `collectionName` in the matching `schema.json`. Keep them in
 * sync whenever a content type's collectionName changes — the Document
 * Service catches that automatically, raw Knex does not.
 */
export const TABLES = {
  /** `api::event.event` → `packages/api/src/api/event/content-types/event/schema.json` */
  events: "events",
  /** `api::ticket-order.ticket-order` → `packages/api/src/api/ticket-order/content-types/ticket-order/schema.json` */
  ticketOrders: "ticket_orders",
  /** `api::ticket-type.ticket-type` → `packages/api/src/api/ticket-type/content-types/ticket-type/schema.json` */
  ticketTypes: "ticket_types",
} as const
