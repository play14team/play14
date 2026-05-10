import { beforeEach, describe, expect, it, vi } from "vitest"
import { sendEmail } from "./email-send"

function createMockStrapi(
  opts: {
    sendImpl?: (options: any) => Promise<unknown>
    documentCreateImpl?: (args: any) => Promise<unknown>
  } = {}
) {
  const emailSend = opts.sendImpl
    ? vi.fn(opts.sendImpl)
    : vi.fn().mockResolvedValue({ id: "msg_abc123" })
  const documentCreate = opts.documentCreateImpl
    ? vi.fn(opts.documentCreateImpl)
    : vi.fn().mockResolvedValue({ documentId: "log_1" })

  const strapi = {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    plugin: vi.fn().mockReturnValue({
      service: vi.fn().mockReturnValue({ send: emailSend }),
    }),
    documents: vi.fn().mockReturnValue({ create: documentCreate }),
  } as any

  return { strapi, emailSend, documentCreate }
}

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("persists an email-log row with status=sent on success", async () => {
    const { strapi, emailSend, documentCreate } = createMockStrapi()

    const result = await sendEmail(strapi, "confirmation", {
      to: "alice@example.com",
      subject: "Welcome",
      html: "<p>Hi</p>",
      text: "Hi",
      from: "noreply@play14.org",
    })

    expect(emailSend).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: "msg_abc123" })
    expect(strapi.documents).toHaveBeenCalledWith("api::email-log.email-log")
    expect(documentCreate).toHaveBeenCalledOnce()

    const logArgs = documentCreate.mock.calls[0][0]
    expect(logArgs.data).toMatchObject({
      to: "alice@example.com",
      subject: "Welcome",
      emailType: "confirmation",
      emailStatus: "sent",
      providerMessageId: "msg_abc123",
      bodyHtml: "<p>Hi</p>",
      bodyText: "Hi",
      fromAddress: "noreply@play14.org",
    })
    expect(typeof logArgs.data.sentAt).toBe("string")
  })

  it("joins array recipients into a comma-separated string", async () => {
    const { strapi, documentCreate } = createMockStrapi()

    await sendEmail(strapi, "user_invitation", {
      to: ["a@example.com", "b@example.com"],
      cc: ["c@example.com"],
      subject: "Invite",
    })

    const logArgs = documentCreate.mock.calls[0][0]
    expect(logArgs.data.to).toBe("a@example.com, b@example.com")
    expect(logArgs.data.cc).toBe("c@example.com")
  })

  it("truncates oversized bodies before persisting", async () => {
    const { strapi, documentCreate } = createMockStrapi()
    const oversized = "x".repeat(300 * 1024)

    await sendEmail(strapi, "confirmation", {
      to: "alice@example.com",
      subject: "Big",
      html: oversized,
      text: oversized,
    })

    const data = documentCreate.mock.calls[0][0].data
    expect(Buffer.byteLength(data.bodyHtml, "utf8")).toBeLessThanOrEqual(256 * 1024)
    expect(Buffer.byteLength(data.bodyText, "utf8")).toBeLessThanOrEqual(256 * 1024)
    expect(data.bodyHtml).toMatch(/…\[truncated at 262144 bytes\]$/)
    expect(data.bodyText).toMatch(/…\[truncated at 262144 bytes\]$/)
  })

  it("captures attachment filenames in the log", async () => {
    const { strapi, documentCreate } = createMockStrapi()

    await sendEmail(strapi, "confirmation", {
      to: "alice@example.com",
      subject: "Ticket",
      attachments: [
        { filename: "ticket.pdf", content: Buffer.from("x") },
        { filename: "invite.ics", content: "BEGIN:VCALENDAR" },
      ],
    })

    const logArgs = documentCreate.mock.calls[0][0]
    expect(logArgs.data.attachmentNames).toEqual(["ticket.pdf", "invite.ics"])
  })

  it("persists a failed log row and re-throws the provider error", async () => {
    const providerError = new Error("Sender.net API error (400): suppressed")
    const { strapi, documentCreate } = createMockStrapi({
      sendImpl: vi.fn().mockRejectedValue(providerError),
    })

    await expect(
      sendEmail(strapi, "ticket_sold", { to: "host@example.com", subject: "Sale" })
    ).rejects.toThrow("Sender.net API error (400): suppressed")

    expect(documentCreate).toHaveBeenCalledOnce()
    const logArgs = documentCreate.mock.calls[0][0]
    expect(logArgs.data.emailStatus).toBe("failed")
    expect(logArgs.data.errorMessage).toBe("Sender.net API error (400): suppressed")
    expect(logArgs.data.providerMessageId).toBeUndefined()
  })

  it("does not mask the send result when audit-log persistence fails", async () => {
    const { strapi, emailSend } = createMockStrapi({
      documentCreateImpl: vi.fn().mockRejectedValue(new Error("db down")),
    })

    const result = await sendEmail(strapi, "confirmation", {
      to: "alice@example.com",
      subject: "Welcome",
    })

    expect(result).toBeDefined()
    expect(emailSend).toHaveBeenCalledOnce()
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist email-log row (sent)")
    )
  })

  it("re-throws the provider error even when audit-log persistence also fails", async () => {
    const providerError = new Error("timeout")
    const { strapi } = createMockStrapi({
      sendImpl: vi.fn().mockRejectedValue(providerError),
      documentCreateImpl: vi.fn().mockRejectedValue(new Error("db down")),
    })

    await expect(
      sendEmail(strapi, "confirmation", { to: "alice@example.com", subject: "Hi" })
    ).rejects.toThrow("timeout")

    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist email-log row (failed)")
    )
  })

  it("captures sentAt before the provider call, not after it returns", async () => {
    const captureStart = Date.now()
    let providerResolvedAt: number | undefined

    const { strapi, documentCreate } = createMockStrapi({
      sendImpl: async () => {
        // Simulate a slow provider so any post-send timestamp would drift.
        await new Promise((resolve) => setTimeout(resolve, 50))
        providerResolvedAt = Date.now()
        return { id: "msg_x" }
      },
    })

    await sendEmail(strapi, "confirmation", { to: "alice@example.com", subject: "Hi" })

    const loggedSentAt = new Date(documentCreate.mock.calls[0][0].data.sentAt as string).getTime()
    expect(providerResolvedAt).toBeDefined()
    expect(providerResolvedAt! - loggedSentAt).toBeGreaterThanOrEqual(40)
    expect(loggedSentAt - captureStart).toBeLessThan(20)
  })

  it("skips the audit log when the recipient is empty", async () => {
    const { strapi, emailSend, documentCreate } = createMockStrapi()

    await sendEmail(strapi, "confirmation", { to: "", subject: "Hi" })

    expect(emailSend).toHaveBeenCalledOnce()
    expect(documentCreate).not.toHaveBeenCalled()
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping audit log: no recipient")
    )
  })

  it("attaches caller-supplied context to the audit log", async () => {
    const { strapi, documentCreate } = createMockStrapi()

    await sendEmail(
      strapi,
      "ticket_refund",
      { to: "alice@example.com", subject: "Refund" },
      { context: { orderNumber: "P14-001", refundCents: 5000 } }
    )

    const logArgs = documentCreate.mock.calls[0][0]
    expect(logArgs.data.context).toEqual({ orderNumber: "P14-001", refundCents: 5000 })
  })
})
