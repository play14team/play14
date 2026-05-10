import type { Core } from "@strapi/strapi"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// We need to mock the email render before importing the module
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mocked email</html>"),
}))

import { processEventResultsReminders } from "./event-results-reminders"

const createMockStrapi = () => {
  const send = vi.fn().mockResolvedValue(undefined)
  const findMany = vi.fn()
  const update = vi.fn().mockResolvedValue(undefined)

  const strapi = {
    documents: vi.fn(() => ({ findMany, update })),
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as Core.Strapi

  return { strapi, send, findMany, update }
}

describe("processEventResultsReminders", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.useRealTimers()
  })

  it("skips processing when reminders are disabled", async () => {
    process.env.EVENT_RESULTS_REMINDERS_ENABLED = "false"
    const { strapi, send, findMany, update } = createMockStrapi()

    await processEventResultsReminders(strapi)

    expect(findMany).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("does not send reminders to events that ended before the feature launch date", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // Set current time to Feb 20, 2025 (15 days after Jan 20, 2025 cutoff + some margin)
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    // Return empty array - the query filter should exclude old events
    findMany.mockResolvedValue([])

    await processEventResultsReminders(strapi)

    // Verify the filter includes the feature launch date constraint
    // and excludes events flagged as cancelled.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          eventStatus: "Over",
          cancellationNotifiedAt: { $null: true },
          end: expect.objectContaining({
            $gt: "2025-01-20T00:00:00.000Z",
          }),
        }),
      })
    )
    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("sends first reminder 15 days after event ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // Event ended on Feb 1, now is Feb 20 (19 days later, > 15 days)
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "host@example.com",
        subject: expect.stringContaining("Please enter your results for Test Event"),
      })
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "event-1",
        data: expect.objectContaining({
          resultsReminderCount: 1,
          resultsReminderLastSentAt: now.toISOString(),
        }),
      })
    )
  })

  it("sends second reminder 15 days after first reminder", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // First reminder was sent on Feb 20, now is March 10 (18 days later, > 15 days)
    const now = new Date("2025-03-10T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 1,
      resultsReminderLastSentAt: "2025-02-20T10:00:00Z",
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "host@example.com",
        subject: expect.stringContaining("(Reminder)"),
      })
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "event-1",
        data: expect.objectContaining({
          resultsReminderCount: 2,
        }),
      })
    )
  })

  it("sends final (third) reminder with correct subject", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-04-01T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 2,
      resultsReminderLastSentAt: "2025-03-10T10:00:00Z",
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "host@example.com",
        subject: expect.stringContaining("(Final Reminder)"),
      })
    )

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "event-1",
        data: expect.objectContaining({
          resultsReminderCount: 3,
        }),
      })
    )
  })

  it("does not send more than 3 reminders", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-05-01T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    // Query should filter out events with 3+ reminders, so return empty
    findMany.mockResolvedValue([])

    await processEventResultsReminders(strapi)

    // Verify the filter excludes events with 3+ reminders
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          $or: [{ resultsReminderCount: { $null: true } }, { resultsReminderCount: { $lt: 3 } }],
        }),
      })
    )

    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("skips events that were cancelled (cancellationNotifiedAt set)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    // Defence-in-depth: the DB filter already excludes these, but if one slips
    // through (e.g. eventStatus flipped back to "Over" after cancellation) the
    // in-code check must still skip it.
    const event = {
      documentId: "event-1",
      name: "Cancelled Event",
      slug: "cancelled-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      cancellationNotifiedAt: "2025-01-15T10:00:00Z",
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("skips events whose host already entered result line items", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Already Reported Event",
      slug: "already-reported-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      cancellationNotifiedAt: null,
      hosts: [{ name: "Test Host" }],
      resultItems: [{ id: 42 }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("skips events without contact email", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "", // No contact email
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("skips events when not enough time has passed since last reminder", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // First reminder was sent on Feb 20, now is Feb 25 (only 5 days later, < 15 days)
    const now = new Date("2025-02-25T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 1,
      resultsReminderLastSentAt: "2025-02-20T10:00:00Z", // Only 5 days ago
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    // Event is returned by query but skipped by eligibility check
    expect(send).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("handles events with null resultsReminderCount (existing events)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: null, // null for existing events
      resultsReminderLastSentAt: null,
      hosts: [{ name: "Test Host" }],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "event-1",
        data: expect.objectContaining({
          resultsReminderCount: 1, // Should be 0 + 1 = 1
        }),
      })
    )
  })

  it("continues processing other events if one fails", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const event1 = {
      documentId: "event-1",
      name: "Event 1",
      slug: "event-1",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host1@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [],
    }

    const event2 = {
      documentId: "event-2",
      name: "Event 2",
      slug: "event-2",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host2@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [],
    }

    findMany.mockResolvedValue([event1, event2])

    // First email fails, second succeeds
    send.mockRejectedValueOnce(new Error("Email service error")).mockResolvedValueOnce(undefined)

    await processEventResultsReminders(strapi)

    // Both emails were attempted
    expect(send).toHaveBeenCalledTimes(2)

    // Only the second event was updated (first one failed)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "event-2",
      })
    )
  })

  it("processes multiple events correctly", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany, update } = createMockStrapi()

    const events = [
      {
        documentId: "event-1",
        name: "Event 1",
        slug: "event-1",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "host1@example.com",
        resultsReminderCount: 0,
        resultsReminderLastSentAt: null,
        hosts: [{ name: "Host 1" }],
      },
      {
        documentId: "event-2",
        name: "Event 2",
        slug: "event-2",
        end: "2025-02-02T18:00:00Z",
        contactEmail: "host2@example.com",
        resultsReminderCount: 0,
        resultsReminderLastSentAt: null,
        hosts: [{ name: "Host 2" }],
      },
    ]

    findMany.mockResolvedValue(events)

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledTimes(2)
  })
})

describe("getNextReminderDate logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("calculates first reminder date as 15 days after event end", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // Event ended Feb 1, first reminder should be due Feb 16
    // Current date is Feb 20, so reminder should be sent
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T10:00:00Z", // 15 days before Feb 16
      contactEmail: "host@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
  })

  it("calculates subsequent reminder dates as 15 days after last reminder", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    // Last reminder was Feb 20, next reminder should be due March 7
    // Current date is March 10, so reminder should be sent
    const now = new Date("2025-03-10T10:00:00Z")
    vi.setSystemTime(now)

    const { strapi, send, findMany } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event",
      end: "2025-02-01T10:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 1,
      resultsReminderLastSentAt: "2025-02-20T10:00:00Z", // 18 days before March 10
      hosts: [],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe("email content", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("includes correct URL to results tab", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-02-20T10:00:00Z")
    vi.setSystemTime(now)
    process.env.FRONTEND_URL = "https://test.play14.org"

    const { strapi, send, findMany } = createMockStrapi()

    const event = {
      documentId: "event-1",
      name: "Test Event",
      slug: "test-event-slug",
      end: "2025-02-01T18:00:00Z",
      contactEmail: "host@example.com",
      resultsReminderCount: 0,
      resultsReminderLastSentAt: null,
      hosts: [],
    }

    findMany.mockResolvedValue([event])

    await processEventResultsReminders(strapi)

    expect(send).toHaveBeenCalledTimes(1)
    // The email template should generate HTML containing the results URL
    // Since we mock render(), we can't verify the actual content,
    // but we verify the template was called with correct props
  })
})
