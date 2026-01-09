/**
 * Event controller
 * Extends the core controller to add ticketingMode backwards compatibility
 */

import { factories } from "@strapi/strapi"

/**
 * Compute ticketingMode for backwards compatibility if not set
 *
 * Logic:
 * - If ticketingMode is explicitly set to "internal" or "external", use it
 * - If ticketingMode is "none" or not set, derive from legacy fields:
 *   - If stripeAccount exists → "internal"
 *   - If registration.link or widgetCode exists → "external"
 *   - Otherwise → "none"
 */
function computeTicketingMode(event: any): "none" | "internal" | "external" {
  // If explicitly set to internal or external, use it
  if (event.ticketingMode === "internal" || event.ticketingMode === "external") {
    return event.ticketingMode
  }

  // Derive from legacy fields for existing events or when mode is "none"
  // Check stripeAccount first (internal takes priority)
  if (event.stripeAccount) {
    return "internal"
  }
  if (event.registration?.link || event.registration?.widgetCode) {
    return "external"
  }
  return "none"
}

/**
 * Add ticketingMode to event response
 */
function addTicketingMode(event: any): any {
  if (!event) return event
  return {
    ...event,
    ticketingMode: computeTicketingMode(event),
  }
}

export default factories.createCoreController("api::event.event", ({ strapi }) => ({
  async find(ctx) {
    const { data, meta } = await super.find(ctx)
    return {
      data: Array.isArray(data) ? data.map(addTicketingMode) : addTicketingMode(data),
      meta,
    }
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx)
    if (response?.data) {
      response.data = addTicketingMode(response.data)
    }
    return response
  },
}))
