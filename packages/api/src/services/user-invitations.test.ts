import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { Core } from "@strapi/strapi"
import { processUserInvitations } from "./user-invitations"

const createMockStrapi = () => {
  const send = vi.fn()
  const findMany = vi.fn()
  const update = vi.fn()

  // Mock knex query builder for atomic claims
  const knexUpdate = vi.fn().mockResolvedValue(1) // Return 1 to indicate successful claim
  const knexWhere = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ update: knexUpdate }) })
  const knexConnection = vi.fn().mockReturnValue({ where: knexWhere })

  const strapi = {
    documents: vi.fn(() => ({ findMany, update })),
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
    log: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    db: {
      connection: knexConnection,
    },
  } as unknown as Core.Strapi

  return { strapi, send, findMany, update, knexUpdate }
}

describe("processUserInvitations", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.useRealTimers()
  })

  it("skips processing when invitations are disabled", async () => {
    process.env.INVITATION_EMAILS_ENABLED = "false"
    process.env.INVITATION_SEND_DELAY_MS = "0"
    process.env.INVITATION_SEND_MAX_RETRIES = "0"
    process.env.INVITATION_SEND_RETRY_DELAY_MS = "0"
    const { strapi, send, findMany, update } = createMockStrapi()

    await processUserInvitations(strapi)

    expect(findMany).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("sends invites and reminders and updates user statuses", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const now = new Date("2025-03-14T10:00:00Z")
    vi.setSystemTime(now)
    process.env.INVITATION_SEND_LIMIT = "10"
    process.env.INVITATION_REMINDER_DAYS = "7"
    process.env.INVITATION_SEND_DELAY_MS = "0"
    process.env.INVITATION_SEND_MAX_RETRIES = "0"
    process.env.INVITATION_SEND_RETRY_DELAY_MS = "0"

    const { strapi, send, findMany, update } = createMockStrapi()

    const pendingUser = {
      id: 1,
      documentId: "user-1",
      email: "pending@example.com",
      username: "pending",
      invitationStatus: "pending",
      player: { name: "Pending Player" },
    }
    const reminderUser = {
      id: 2,
      documentId: "user-2",
      email: "reminder@example.com",
      username: "reminder",
      invitationStatus: "sent",
      invitationSentAt: "2025-03-01T10:00:00Z",
      player: { name: "Reminder Player" },
    }

    findMany.mockResolvedValueOnce([pendingUser]).mockResolvedValueOnce([reminderUser])

    await processUserInvitations(strapi)

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        filters: expect.objectContaining({ invitationStatus: "pending" }),
        limit: 10,
      })
    )

    const reminderThreshold = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filters: expect.objectContaining({
          invitationStatus: "sent",
          invitationSentAt: { $lt: reminderThreshold },
          invitationReminderSentAt: { $null: true },
        }),
        limit: 10,
      })
    )

    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "pending@example.com",
      subject: "You're invited to #play14",
    })
    expect(send.mock.calls[1][0]).toMatchObject({
      to: "reminder@example.com",
      subject: "Reminder: your #play14 account is ready",
    })

    expect(update).toHaveBeenCalledTimes(4)
    expect(update.mock.calls[0][0]).toMatchObject({
      documentId: "user-1",
      data: expect.objectContaining({ resetPasswordToken: expect.any(String) }),
    })
    expect(update.mock.calls[1][0]).toMatchObject({
      documentId: "user-1",
      data: expect.objectContaining({ invitationStatus: "sent" }),
    })
    expect(update.mock.calls[2][0]).toMatchObject({
      documentId: "user-2",
      data: expect.objectContaining({ resetPasswordToken: expect.any(String) }),
    })
    expect(update.mock.calls[3][0]).toMatchObject({
      documentId: "user-2",
      data: expect.objectContaining({ invitationStatus: "reminded" }),
    })
  })
})
