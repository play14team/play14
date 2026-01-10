/**
 * Event test data factory
 */

export interface EventFixture {
  documentId: string
  name: string
  slug: string
  description: string | null
  start: string
  end: string
  timezone: string
  status: "Announced" | "Open" | "Closed" | "Ongoing" | "Passed" | "Cancelled"
  contactEmail: string | null
  maxParticipants: number | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

let eventCounter = 0

/**
 * Create an event fixture with sensible defaults
 */
export function createEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  eventCounter++
  const now = new Date()
  const start = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days after start

  return {
    documentId: `event-${eventCounter}`,
    name: `Test Event ${eventCounter}`,
    slug: `test-event-${eventCounter}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    description: `Description for test event ${eventCounter}`,
    start: start.toISOString(),
    end: end.toISOString(),
    timezone: "Europe/Paris",
    status: "Open",
    contactEmail: `event${eventCounter}@play14.org`,
    maxParticipants: 50,
    isPublic: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  }
}

/**
 * Create a past event
 */
export function createPastEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  const now = new Date()
  const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)

  return createEvent({
    start: start.toISOString(),
    end: end.toISOString(),
    status: "Passed",
    ...overrides,
  })
}

/**
 * Create an ongoing event
 */
export function createOngoingEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  const now = new Date()
  const start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // Started yesterday
  const end = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // Ends tomorrow

  return createEvent({
    start: start.toISOString(),
    end: end.toISOString(),
    status: "Ongoing",
    ...overrides,
  })
}

/**
 * Create a cancelled event
 */
export function createCancelledEvent(
  overrides: Partial<EventFixture> = {}
): EventFixture {
  return createEvent({
    status: "Cancelled",
    ...overrides,
  })
}

/**
 * Create an announced (not yet open) event
 */
export function createAnnouncedEvent(
  overrides: Partial<EventFixture> = {}
): EventFixture {
  return createEvent({
    status: "Announced",
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetEventCounter(): void {
  eventCounter = 0
}
