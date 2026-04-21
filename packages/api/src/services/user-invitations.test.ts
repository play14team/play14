import type { Core } from "@strapi/strapi"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { processUserInvitations } from "./user-invitations"

const createMockStrapi = () => {
  const send = vi.fn()
  const findMany = vi.fn()
  const update = vi.fn()

  // Knex is called in two shapes in user-invitations.ts:
  //   - claim: .where(col, val).where(col, val).update({...})   (two chained wheres)
  //   - revert/suppress: .where(col, val).update({...})         (single where)
  // The claim mock always returns 1 so the claim succeeds; the shorter chain
  // captures revert/suppress writes so tests can assert on them.
  const claimUpdate = vi.fn().mockResolvedValue(1)
  const terminalUpdate = vi.fn().mockResolvedValue(1)
  const knexConnection = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ update: claimUpdate }),
      update: terminalUpdate,
    }),
  })

  const strapi = {
    documents: vi.fn(() => ({ findMany, update })),
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    db: {
      connection: knexConnection,
    },
  } as unknown as Core.Strapi

  return { strapi, send, findMany, update, claimUpdate, terminalUpdate }
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

    const reminderThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
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

  it("marks the user as suppressed when the provider reports a permanent failure", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2025-03-14T10:00:00Z"))
    process.env.INVITATION_SEND_LIMIT = "10"
    process.env.INVITATION_REMINDER_DAYS = "7"
    process.env.INVITATION_SEND_DELAY_MS = "0"
    process.env.INVITATION_SEND_MAX_RETRIES = "0"
    process.env.INVITATION_SEND_RETRY_DELAY_MS = "0"

    const { strapi, send, findMany, update, terminalUpdate } = createMockStrapi()

    const suppressedUser = {
      id: 3,
      documentId: "user-3",
      email: "suppressed@example.com",
      username: "suppressed",
      invitationStatus: "sent",
      invitationSentAt: "2025-03-01T10:00:00Z",
      player: { name: "Suppressed Player" },
    }

    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([suppressedUser])

    const permanentError = Object.assign(
      new Error(
        'Sender.net API error (400): {"message":"email is on suppression list","success":false,"type":"mailer"}'
      ),
      { statusCode: 400, permanent: true }
    )
    send.mockRejectedValueOnce(permanentError)

    await processUserInvitations(strapi)

    // Suppression path writes via the single-where knex chain, not the documents API.
    expect(terminalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ invitation_status: "suppressed" })
    )
    // No status revert to "sent" and no "reminded" write should have happened.
    expect(terminalUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ invitation_status: "sent" })
    )
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invitationStatus: "reminded" }),
      })
    )
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("recipient suppressed"))
    expect(strapi.log.error).not.toHaveBeenCalled()
  })
})
