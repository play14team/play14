/**
 * Integration tests for Event Results Reminders cron job
 *
 * Tests the full flow of sending reminder emails to event contacts
 * after events end.
 *
 * Prerequisites:
 * - Test database container running: `podman-compose up play14-db-test`
 * - Strapi built: `bun --filter play14-api build`
 */

import type { Core } from "@strapi/strapi"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { processEventResultsReminders } from "../../services/cron/event-results-reminders"
import { cleanupTestData } from "../../test-utils/seed-database"
import {
  setupStrapiTestInstance,
  teardownStrapiTestInstance,
} from "../../test-utils/strapi-test-instance"

// Mock the email render to avoid issues with React.email in test environment
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mocked email</html>"),
}))

describe("Event Results Reminders Integration", () => {
  let strapi: Core.Strapi
  let emailSendSpy: ReturnType<typeof vi.spyOn>

  beforeAll(async () => {
    strapi = await setupStrapiTestInstance()
  }, 60000)

  afterAll(async () => {
    await teardownStrapiTestInstance()
  })

  beforeEach(async () => {
    await cleanupTestData(strapi)
    vi.useRealTimers()
    vi.clearAllMocks()

    // Spy on email sending
    emailSendSpy = vi.spyOn(strapi.plugin("email").service("email"), "send")
    emailSendSpy.mockResolvedValue(undefined)
  })

  async function createTestEventWithDetails(options: {
    name: string
    slug: string
    end: string
    contactEmail: string
    eventStatus?: string
    resultsReminderCount?: number
    resultsReminderLastSentAt?: string | null
    cancellationNotifiedAt?: string | null
    hosts?: number[]
  }) {
    const event = await strapi.documents("api::event.event").create({
      data: {
        name: options.name,
        slug: options.slug,
        start: new Date(new Date(options.end).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        end: options.end,
        timezone: "Europe/Paris",
        eventStatus: options.eventStatus || "Over",
        contactEmail: options.contactEmail,
        resultsReminderCount: options.resultsReminderCount ?? 0,
        resultsReminderLastSentAt: options.resultsReminderLastSentAt ?? null,
        cancellationNotifiedAt: options.cancellationNotifiedAt ?? null,
        hosts: options.hosts,
      } as any,
    })
    return event
  }

  async function addResultLineItem(eventDocumentId: string) {
    await strapi.documents("api::result-line-item.result-line-item").create({
      data: {
        category: "other_income",
        name: "Seed amount",
        amount: 100,
        event: eventDocumentId,
      } as any,
    })
  }

  describe("reminder eligibility", () => {
    it("sends first reminder for event that ended 15+ days ago", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      // Event ended Feb 1, 2025, current date is Feb 20, 2025
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Test Conference 2025",
        slug: "test-conference-2025",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledTimes(1)
      expect(emailSendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "organizer@example.com",
          subject: expect.stringContaining("Test Conference 2025"),
        })
      )
    })

    it("does not send reminder for event that ended less than 15 days ago", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      // Event ended Feb 10, 2025, current date is Feb 20, 2025 (only 10 days)
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Recent Event",
        slug: "recent-event",
        end: "2025-02-10T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send reminder for event that ended before feature launch date", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      // Event ended Jan 10, 2025 (before launch date of Jan 20, 2025)
      // Current date is Feb 10, 2025
      vi.setSystemTime(new Date("2025-02-10T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Old Event",
        slug: "old-event",
        end: "2025-01-10T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send reminder for non-Over events", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Open Event",
        slug: "open-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Open", // Not "Over"
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send reminder for events that were cancelled", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      // Simulates an event that was cancelled and later auto-transitioned to
      // "Over" (e.g. by the updateEventStatus cron if its status was flipped
      // back, or by a manual admin edit). The cancellation timestamp is the
      // durable signal that the event never happened.
      await createTestEventWithDetails({
        name: "Cancelled Event",
        slug: "cancelled-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        cancellationNotifiedAt: "2025-01-20T10:00:00Z",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send reminder for events that already have result line items", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      const event = await createTestEventWithDetails({
        name: "Event With Results",
        slug: "event-with-results",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await addResultLineItem(event.documentId)

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send reminder to event without contact email", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "No Contact Event",
        slug: "no-contact-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "", // No contact email
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })
  })

  describe("reminder counting", () => {
    it("updates reminder count after sending", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      const event = await createTestEventWithDetails({
        name: "Counter Test Event",
        slug: "counter-test-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      // Fetch the updated event
      const updatedEvent = await strapi.documents("api::event.event").findOne({
        documentId: event.documentId,
        fields: ["resultsReminderCount", "resultsReminderLastSentAt"],
      })

      expect(updatedEvent?.resultsReminderCount).toBe(1)
      expect(updatedEvent?.resultsReminderLastSentAt).toBe("2025-02-20T10:00:00.000Z")
    })

    it("sends second reminder 15 days after first", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      // First reminder was sent Feb 20, now is March 10 (18 days later)
      vi.setSystemTime(new Date("2025-03-10T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Second Reminder Event",
        slug: "second-reminder-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 1,
        resultsReminderLastSentAt: "2025-02-20T10:00:00Z",
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledTimes(1)
      expect(emailSendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("(Reminder)"),
        })
      )
    })

    it("does not send more than 3 reminders", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-05-01T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Max Reminders Event",
        slug: "max-reminders-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 3, // Already sent 3 reminders
        resultsReminderLastSentAt: "2025-04-01T10:00:00Z",
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })

    it("does not send second reminder too early", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      // First reminder was sent Feb 20, now is Feb 25 (only 5 days later)
      vi.setSystemTime(new Date("2025-02-25T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Early Second Reminder Event",
        slug: "early-second-reminder-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 1,
        resultsReminderLastSentAt: "2025-02-20T10:00:00Z",
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()
    })
  })

  describe("multiple events", () => {
    it("processes multiple eligible events", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Event One",
        slug: "event-one",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer1@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await createTestEventWithDetails({
        name: "Event Two",
        slug: "event-two",
        end: "2025-02-02T18:00:00Z",
        contactEmail: "organizer2@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledTimes(2)
    })

    it("only processes eligible events from a mixed set", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      // Eligible: ended 15+ days ago, status Over, 0 reminders
      await createTestEventWithDetails({
        name: "Eligible Event",
        slug: "eligible-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      // Not eligible: ended less than 15 days ago
      await createTestEventWithDetails({
        name: "Too Recent Event",
        slug: "too-recent-event",
        end: "2025-02-10T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      // Not eligible: status is not Over
      await createTestEventWithDetails({
        name: "Open Event",
        slug: "open-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Open",
        resultsReminderCount: 0,
      })

      // Not eligible: already sent 3 reminders
      await createTestEventWithDetails({
        name: "Max Reminders Event",
        slug: "max-reminders-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 3,
        resultsReminderLastSentAt: "2025-02-15T10:00:00Z",
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledTimes(1)
      expect(emailSendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "organizer@example.com",
          subject: expect.stringContaining("Eligible Event"),
        })
      )
    })
  })

  describe("email content", () => {
    it("sends email with correct subject for first reminder", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "First Reminder Event",
        slug: "first-reminder-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[#play14] Please enter your results for First Reminder Event",
        })
      )
    })

    it("sends email with correct subject for final reminder", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-04-01T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Final Reminder Event",
        slug: "final-reminder-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 2,
        resultsReminderLastSentAt: "2025-03-10T10:00:00Z",
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[#play14] Please enter your results for Final Reminder Event (Final Reminder)",
        })
      )
    })
  })

  describe("error handling", () => {
    it("continues processing other events when one fails", async () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Event A",
        slug: "event-a",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizerA@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await createTestEventWithDetails({
        name: "Event B",
        slug: "event-b",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizerB@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      // First call fails, second succeeds
      emailSendSpy
        .mockRejectedValueOnce(new Error("Email service error"))
        .mockResolvedValueOnce(undefined)

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).toHaveBeenCalledTimes(2)

      // Verify only the successful event was updated
      const events = await strapi.documents("api::event.event").findMany({
        filters: { eventStatus: "Over" },
        fields: ["name", "resultsReminderCount"],
      })

      const eventA = events.find((e: any) => e.name === "Event A")
      const eventB = events.find((e: any) => e.name === "Event B")

      // Event A failed, so count should still be 0
      expect(eventA?.resultsReminderCount).toBe(0)
      // Event B succeeded, so count should be 1
      expect(eventB?.resultsReminderCount).toBe(1)
    })
  })

  describe("disabled mode", () => {
    it("does not process when EVENT_RESULTS_REMINDERS_ENABLED is false", async () => {
      const originalEnv = process.env.EVENT_RESULTS_REMINDERS_ENABLED
      process.env.EVENT_RESULTS_REMINDERS_ENABLED = "false"

      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2025-02-20T10:00:00Z"))

      await createTestEventWithDetails({
        name: "Disabled Mode Event",
        slug: "disabled-mode-event",
        end: "2025-02-01T18:00:00Z",
        contactEmail: "organizer@example.com",
        eventStatus: "Over",
        resultsReminderCount: 0,
      })

      await processEventResultsReminders(strapi)

      expect(emailSendSpy).not.toHaveBeenCalled()

      process.env.EVENT_RESULTS_REMINDERS_ENABLED = originalEnv
    })
  })
})
