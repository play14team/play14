/**
 * Event test data factory for web package
 *
 * Creates mock event data matching Strapi API responses
 */

export interface EventImage {
  name: string
  url: string
  width: number
  height: number
}

export interface EventLocation {
  name: string
  country: string
  slug?: string
}

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
  defaultImage: EventImage | null
  location: EventLocation | null
}

let eventCounter = 0

/**
 * Create an event fixture with sensible defaults
 */
export function createEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  eventCounter++
  const now = new Date()
  const start = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)

  return {
    documentId: `event-${eventCounter}`,
    name: `Test Event ${eventCounter}`,
    slug: `test-event-${eventCounter}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    description: `<p>Description for test event ${eventCounter}</p>`,
    start: start.toISOString(),
    end: end.toISOString(),
    timezone: "Europe/Paris",
    status: "Open",
    contactEmail: `event${eventCounter}@play14.org`,
    defaultImage: {
      name: `event-${eventCounter}.jpg`,
      url: `https://example.com/images/event-${eventCounter}.jpg`,
      width: 1200,
      height: 800,
    },
    location: {
      name: "Paris",
      country: "FR",
      slug: "paris",
    },
    ...overrides,
  }
}

/**
 * Create a past event
 */
export function createPastEvent(overrides: Partial<EventFixture> = {}): EventFixture {
  const now = new Date()
  const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)

  return createEvent({
    start: start.toISOString(),
    end: end.toISOString(),
    status: "Passed",
    ...overrides,
  })
}

/**
 * Create an event without an image
 */
export function createEventWithoutImage(
  overrides: Partial<EventFixture> = {}
): EventFixture {
  return createEvent({
    defaultImage: null,
    ...overrides,
  })
}

/**
 * Reset the counter (useful in beforeEach)
 */
export function resetEventCounter(): void {
  eventCounter = 0
}
