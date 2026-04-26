/**
 * Unit tests for the Event content-type lifecycle's notifyEventCancellation.
 *
 * Focuses on the branching logic that gates email dispatch:
 *   - status / pre-existing notifiedAt short-circuits
 *   - distributed-lock failure short-circuits
 *   - idempotency re-check after the lock is held
 *   - happy path writes the cancellation timestamp via raw Knex
 *   - sendEventCancellationEmails failures don't release the lock leak path
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// vi.mock is hoisted to the top of the file, so the mock factories must not
// reference module-scope variables. vi.hoisted lets us share spies between
// the factory and the test bodies.
const mocks = vi.hoisted(() => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  sendEventCancellationEmails: vi.fn(),
  triggerContentRevalidation: vi.fn(),
}))

vi.mock("../../../../services/cron/distributed-lock", () => ({
  acquireLock: mocks.acquireLock,
  releaseLock: mocks.releaseLock,
}))

vi.mock("../../../../services/email-templates", () => ({
  sendEventCancellationEmails: mocks.sendEventCancellationEmails,
}))

vi.mock("../../../../services/frontend-revalidation", () => ({
  triggerContentRevalidation: mocks.triggerContentRevalidation,
}))

import { notifyEventCancellation } from "./lifecycles"

describe("notifyEventCancellation", () => {
  // Mocks for the shape of `strapi.documents(...).findOne(...)` and the
  // raw-Knex `strapi.db.connection(table).where(...).update(...)` chain.
  const documentsFindOne = vi.fn()
  const knexUpdate = vi.fn()
  const knexWhere = vi.fn(() => ({ update: knexUpdate }))
  const knexConnection = vi.fn(() => ({ where: knexWhere }))

  beforeEach(() => {
    mocks.acquireLock.mockReset()
    mocks.releaseLock.mockReset()
    mocks.sendEventCancellationEmails.mockReset()
    documentsFindOne.mockReset()
    knexUpdate.mockReset()
    knexWhere.mockClear()
    knexConnection.mockClear()

    knexUpdate.mockResolvedValue(1)

    ;(globalThis as any).strapi = {
      documents: vi.fn(() => ({ findOne: documentsFindOne })),
      db: { connection: knexConnection },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    }
  })

  afterEach(() => {
    delete (globalThis as any).strapi
  })

  it("does nothing when eventStatus is not Cancelled", async () => {
    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Open",
    })

    expect(mocks.acquireLock).not.toHaveBeenCalled()
    expect(mocks.sendEventCancellationEmails).not.toHaveBeenCalled()
  })

  it("does nothing when cancellationNotifiedAt is already set on the input", async () => {
    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Cancelled",
      cancellationNotifiedAt: "2026-04-25T10:00:00.000Z",
    })

    expect(mocks.acquireLock).not.toHaveBeenCalled()
  })

  it("skips dispatch when the distributed lock cannot be acquired", async () => {
    mocks.acquireLock.mockResolvedValue(null)

    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Cancelled",
    })

    expect(mocks.acquireLock).toHaveBeenCalledWith("event-cancellation:evt-1", 5 * 60 * 1000)
    expect(mocks.sendEventCancellationEmails).not.toHaveBeenCalled()
    expect(mocks.releaseLock).not.toHaveBeenCalled()
  })

  it("re-checks cancellationNotifiedAt after fetch and skips if a peer already wrote it", async () => {
    mocks.acquireLock.mockResolvedValue("token-abc")
    documentsFindOne.mockResolvedValue({
      documentId: "evt-1",
      name: "Lux 02",
      start: "2026-05-01T09:00:00.000Z",
      cancellationNotifiedAt: "2026-04-25T10:00:00.000Z",
    })

    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Cancelled",
    })

    expect(mocks.sendEventCancellationEmails).not.toHaveBeenCalled()
    expect(knexConnection).not.toHaveBeenCalled()
    expect(mocks.releaseLock).toHaveBeenCalledWith("event-cancellation:evt-1", "token-abc")
  })

  it("dispatches emails and writes cancellation_notified_at via raw Knex on the happy path", async () => {
    mocks.acquireLock.mockResolvedValue("token-xyz")
    documentsFindOne.mockResolvedValue({
      documentId: "evt-1",
      name: "Lux 02",
      start: "2026-05-01T09:00:00.000Z",
      cancellationNotifiedAt: null,
      cancellationReason: "Venue collapsed",
      location: { name: "Lux", country: "LU" },
      venue: { name: "Hall", location: { place_name: "Kirchberg" } },
    })
    mocks.sendEventCancellationEmails.mockResolvedValue({ sent: 3, failed: 0 })

    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Cancelled",
    })

    expect(mocks.sendEventCancellationEmails).toHaveBeenCalledTimes(1)
    expect(mocks.sendEventCancellationEmails).toHaveBeenCalledWith(
      (globalThis as any).strapi,
      expect.objectContaining({
        documentId: "evt-1",
        name: "Lux 02",
        cancellationReason: "Venue collapsed",
      })
    )

    expect(knexConnection).toHaveBeenCalledWith("events")
    expect(knexWhere).toHaveBeenCalledWith("document_id", "evt-1")
    expect(knexUpdate).toHaveBeenCalledTimes(1)
    const update = knexUpdate.mock.calls[0][0]
    expect(update).toMatchObject({
      cancellation_notified_at: expect.any(Date),
      updated_at: expect.any(Date),
    })

    expect(mocks.releaseLock).toHaveBeenCalledWith("event-cancellation:evt-1", "token-xyz")
  })

  it("releases the lock and logs when sendEventCancellationEmails throws", async () => {
    mocks.acquireLock.mockResolvedValue("token-err")
    documentsFindOne.mockResolvedValue({
      documentId: "evt-1",
      name: "Lux 02",
      start: "2026-05-01T09:00:00.000Z",
      cancellationNotifiedAt: null,
    })
    mocks.sendEventCancellationEmails.mockRejectedValue(new Error("Sender.net down"))

    await notifyEventCancellation({
      documentId: "evt-1",
      eventStatus: "Cancelled",
    })

    expect((globalThis as any).strapi.log.error).toHaveBeenCalledWith(
      expect.stringContaining("Sender.net down")
    )
    expect(knexUpdate).not.toHaveBeenCalled()
    expect(mocks.releaseLock).toHaveBeenCalledWith("event-cancellation:evt-1", "token-err")
  })
})
