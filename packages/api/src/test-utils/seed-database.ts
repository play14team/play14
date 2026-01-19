/**
 * Database seeding utilities for integration tests
 *
 * Provides functions to populate and clean up test data
 * using the real Strapi document service API.
 */

import type { Core } from "@strapi/strapi"

export interface TestUser {
  id: number
  documentId: string
  email: string
  username: string
}

export interface TestPlayer {
  id: number
  documentId: string
  name: string
  slug: string
}

export interface TestEvent {
  id: number
  documentId: string
  name: string
  slug: string
  ticketTypes?: TestTicketType[]
}

export interface TestTicketType {
  id: number
  documentId: string
  name: string
  price: number
  currency: string
  capacity: number | null
}

export interface TestOrder {
  id: number
  documentId: string
  orderNumber: string
  status: string
  providerSessionId: string | null
  providerOrderId: string | null
}

export interface TestStripeAccount {
  id: number
  documentId: string
  stripeAccountId: string
  accountStatus: string
}

let seedCounter = 0

function generateId(): string {
  seedCounter++
  return `test_${seedCounter}_${Date.now()}`
}

/**
 * Clean up all test data from the database
 *
 * Deletes data in correct order to respect foreign key constraints
 */
export async function cleanupTestData(strapi: Core.Strapi): Promise<void> {
  const knex = strapi.db.connection

  // Delete in order to respect foreign keys
  await knex("tickets").del()
  await knex("ticket_orders").del()
  await knex("ticket_types").del()
  await knex("discount_codes").del()
  await knex("stripe_accounts").del()
  await knex("events").del()
  await knex("players").del()
  await knex("up_users").del()

  // Clean up processed webhooks (table may not exist if schema is not migrated)
  const hasProcessedWebhooks = await knex.schema.hasTable("processed_webhooks")
  if (hasProcessedWebhooks) {
    await knex("processed_webhooks").del()
  }

  // Reset counter
  seedCounter = 0
}

/**
 * Create a test user
 */
export async function seedTestUser(
  strapi: Core.Strapi,
  data: Partial<{ email: string; username: string; password: string; role?: string }> = {}
): Promise<TestUser> {
  const id = generateId()
  const email = data.email || `testuser_${id}@example.com`
  const username = data.username || `testuser_${id}`

  // Get the player role (or specified role)
  const roleType = data.role || "player"
  const role = await strapi.query("plugin::users-permissions.role").findOne({
    where: { type: roleType },
  })

  if (!role) {
    throw new Error(`Role '${roleType}' not found. Make sure the database is properly initialized.`)
  }

  const user = await strapi.documents("plugin::users-permissions.user").create({
    data: {
      username,
      email,
      password: data.password || "TestPassword123!",
      confirmed: true,
      blocked: false,
      provider: "local",
      role: role.id,
    },
  })

  return {
    id: user.id,
    documentId: user.documentId,
    email: user.email,
    username: user.username,
  }
}

/**
 * Create a test player
 */
export async function seedTestPlayer(
  strapi: Core.Strapi,
  data: Partial<{
    name: string
    slug: string
    position: string
    email: string
    user: number
  }> = {}
): Promise<TestPlayer> {
  const id = generateId()
  const name = data.name || `Test Player ${id}`
  const slug = data.slug || `test-player-${id}`

  const player = await strapi.documents("api::player.player").create({
    data: {
      name,
      slug,
      position: data.position || "Player",
      email: data.email,
      user: data.user,
    },
  })

  return {
    id: player.id,
    documentId: player.documentId,
    name: player.name,
    slug: player.slug,
  }
}

/**
 * Create a test event with optional ticket types
 */
export async function seedTestEvent(
  strapi: Core.Strapi,
  data: Partial<{
    name: string
    slug: string
    start: string
    end: string
    eventStatus: string
    ticketingMode: string
    stripeAccount: number
    ticketTypes: Array<{
      name: string
      price: number
      currency?: string
      capacity?: number | null
      isActive?: boolean
    }>
    hosts: number[]
    mentors: number[]
  }> = {}
): Promise<TestEvent> {
  const id = generateId()
  const now = new Date()
  const start = data.start || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const end =
    data.end || new Date(new Date(start).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()

  const event = await strapi.documents("api::event.event").create({
    data: {
      name: data.name || `Test Event ${id}`,
      slug: data.slug || `test-event-${id}`,
      start,
      end,
      timezone: "Europe/Paris",
      eventStatus: data.eventStatus || "Open",
      ticketingMode: data.ticketingMode || "internal",
      isPublic: true,
      stripeAccount: data.stripeAccount,
      hosts: data.hosts,
      mentors: data.mentors,
    },
  })

  const result: TestEvent = {
    id: event.id,
    documentId: event.documentId,
    name: event.name,
    slug: event.slug,
    ticketTypes: [],
  }

  // Create ticket types if provided
  if (data.ticketTypes && data.ticketTypes.length > 0) {
    for (const tt of data.ticketTypes) {
      const ticketType = await seedTestTicketType(strapi, {
        event: event.id,
        name: tt.name,
        price: tt.price,
        currency: tt.currency,
        capacity: tt.capacity,
        isActive: tt.isActive,
      })
      result.ticketTypes!.push(ticketType)
    }
  }

  return result
}

/**
 * Create a test ticket type
 */
export async function seedTestTicketType(
  strapi: Core.Strapi,
  data: {
    event: number
    name: string
    price: number
    currency?: string
    capacity?: number | null
    isActive?: boolean
  }
): Promise<TestTicketType> {
  const ticketType = await strapi.documents("api::ticket-type.ticket-type").create({
    data: {
      name: data.name,
      price: data.price,
      currency: data.currency || "EUR",
      capacity: data.capacity ?? 100,
      soldCount: 0,
      reservedCount: 0,
      isActive: data.isActive ?? true,
      event: data.event,
    },
  })

  return {
    id: ticketType.id,
    documentId: ticketType.documentId,
    name: ticketType.name,
    price: ticketType.price,
    currency: ticketType.currency,
    capacity: ticketType.capacity,
  }
}

/**
 * Create a test order
 */
export async function seedTestOrder(
  strapi: Core.Strapi,
  data: Partial<{
    event: number
    player: number
    status: string
    purchaserEmail: string
    purchaserName: string
    totalAmount: number
    currency: string
    providerSessionId: string
    providerOrderId: string
    hasReservation: boolean
    ticketDetails: Array<{ ticketTypeId: string; quantity: number; unitPrice?: number }>
  }>
): Promise<TestOrder> {
  const id = generateId()

  const order = await strapi.documents("api::ticket-order.ticket-order").create({
    data: {
      orderNumber: `P14-TEST-${id}`,
      status: data.status || "pending",
      purchaserEmail: data.purchaserEmail || "test@example.com",
      purchaserName: data.purchaserName || "Test User",
      totalAmount: data.totalAmount ?? 100,
      currency: data.currency || "EUR",
      paymentProvider: "stripe",
      providerSessionId: data.providerSessionId || `cs_test_${id}`,
      providerOrderId: data.providerOrderId,
      hasReservation: data.hasReservation ?? false,
      ticketDetails: data.ticketDetails || [],
      event: data.event,
      player: data.player,
    },
  })

  return {
    id: order.id,
    documentId: order.documentId,
    orderNumber: order.orderNumber,
    status: order.status,
    providerSessionId: order.providerSessionId,
    providerOrderId: order.providerOrderId,
  }
}

/**
 * Create a paid order with tickets
 */
export async function seedPaidOrderWithTickets(
  strapi: Core.Strapi,
  data: {
    event: TestEvent
    player: TestPlayer
    ticketTypeId?: string
    quantity?: number
    totalAmount?: number
  }
): Promise<TestOrder & { tickets: any[] }> {
  const ticketTypeId = data.ticketTypeId || data.event.ticketTypes?.[0]?.documentId
  const quantity = data.quantity || 2

  const order = await seedTestOrder(strapi, {
    event: data.event.id,
    player: data.player.id,
    status: "paid",
    totalAmount: data.totalAmount || 100,
    providerOrderId: `pi_test_${generateId()}`,
    ticketDetails: ticketTypeId
      ? [{ ticketTypeId, quantity, unitPrice: (data.totalAmount || 100) / quantity }]
      : [],
  })

  // Create tickets
  const tickets: any[] = []
  for (let i = 0; i < quantity; i++) {
    const ticket = await strapi.documents("api::ticket.ticket").create({
      data: {
        ticketCode: `TIX-${generateId()}-${i}`,
        ticketStatus: "valid",
        attendeeName: `Attendee ${i + 1}`,
        attendeeEmail: `attendee${i + 1}@example.com`,
        order: order.id,
        event: data.event.id,
        player: data.player.id,
        ticketType: data.event.ticketTypes?.[0]?.id,
      },
    })
    tickets.push(ticket)
  }

  return { ...order, tickets }
}

/**
 * Create a test Stripe Connect account
 */
export async function seedStripeAccount(
  strapi: Core.Strapi,
  data: Partial<{
    stripeAccountId: string
    accountStatus: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    player: number
  }> = {}
): Promise<TestStripeAccount> {
  const id = generateId()

  const account = await strapi.documents("api::stripe-account.stripe-account").create({
    data: {
      stripeAccountId: data.stripeAccountId || `acct_test_${id}`,
      accountStatus: data.accountStatus || "pending",
      chargesEnabled: data.chargesEnabled ?? false,
      payoutsEnabled: data.payoutsEnabled ?? false,
      detailsSubmitted: data.detailsSubmitted ?? false,
      player: data.player,
    },
  })

  return {
    id: account.id,
    documentId: account.documentId,
    stripeAccountId: account.stripeAccountId,
    accountStatus: account.accountStatus,
  }
}

/**
 * Create a test discount code
 */
export async function seedDiscountCode(
  strapi: Core.Strapi,
  data: {
    event: number
    code: string
    discountType: "percentage" | "fixed"
    discountValue: number
    maxUses?: number
    usedCount?: number
    isActive?: boolean
  }
): Promise<{ id: number; documentId: string; code: string }> {
  const discount = await strapi.documents("api::discount-code.discount-code").create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUses: data.maxUses,
      usedCount: data.usedCount || 0,
      isActive: data.isActive ?? true,
      event: data.event,
    },
  })

  return {
    id: discount.id,
    documentId: discount.documentId,
    code: discount.code,
  }
}

/**
 * Link a user to a player
 *
 * Uses the entity service since users-permissions uses integer IDs
 * and the document API types don't include custom relations
 */
export async function linkUserToPlayer(
  strapi: Core.Strapi,
  userId: number,
  playerId: number
): Promise<void> {
  // Use raw query to update the relation since TypeScript types don't include custom relations
  await strapi.db.query("plugin::users-permissions.user").update({
    where: { id: userId },
    data: { player: playerId },
  })
}

/**
 * Reset the seed counter
 */
export function resetSeedCounter(): void {
  seedCounter = 0
}
