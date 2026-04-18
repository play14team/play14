import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type SendOptions = {
  from?: string
  to: string | string[]
  replyTo?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}

// The provider package is CommonJS with a single `init(providerOptions, settings)` export
// that returns `{ send }`. We import it via a relative path because the Strapi provider
// plugin is symlinked into the API package's node_modules at install time but the raw
// source lives under `providers/` in the repository.
const provider = require("../../providers/strapi-provider-email-sender/src/index.js") as {
  init: (
    providerOptions: { apiKey: string },
    settings: { defaultFrom?: string; defaultReplyTo?: string }
  ) => { send: (options: SendOptions) => Promise<unknown> }
}

function createSender(
  providerOptions: { apiKey: string } = { apiKey: "test-api-key" },
  settings: { defaultFrom?: string; defaultReplyTo?: string } = {}
) {
  return provider.init(providerOptions, settings)
}

function mockOkFetch(responseJson: unknown = { success: true }) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(responseJson)),
    json: () => Promise.resolve(responseJson),
  })
  global.fetch = fn as unknown as typeof fetch
  return fn
}

function lastRequestBody(fetchFn: ReturnType<typeof vi.fn>) {
  const call = fetchFn.mock.calls[0]
  const init = call[1] as RequestInit
  return JSON.parse(init.body as string)
}

describe("strapi-provider-email-sender", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  describe("recipients", () => {
    it("maps a string `to` into a single `{ email }` object", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "Sender <sender@play14.org>",
        to: "player@example.com",
        subject: "Hi",
        text: "hello",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.to).toEqual({ email: "player@example.com" })
    })

    it("maps an array `to` into an array of `{ email }` objects", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "sender@play14.org",
        to: ["a@example.com", "b@example.com"],
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.to).toEqual([{ email: "a@example.com" }, { email: "b@example.com" }])
    })

    it("maps an array `replyTo` into an array of `{ email }` objects", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        replyTo: ["ops@play14.org", "help@play14.org"],
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.reply_to).toEqual([{ email: "ops@play14.org" }, { email: "help@play14.org" }])
    })

    it("falls back to defaultReplyTo from settings when replyTo is not provided", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender({ apiKey: "k" }, { defaultReplyTo: "default-reply@play14.org" })

      await sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.reply_to).toEqual({ email: "default-reply@play14.org" })
    })
  })

  describe("from parsing", () => {
    it("parses `Name <email>` into `{ name, email }`", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "Jane Doe <jane@play14.org>",
        to: "player@example.com",
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.from).toEqual({ name: "Jane Doe", email: "jane@play14.org" })
    })

    it("parses a plain email by adding the default community name", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "jane@play14.org",
        to: "player@example.com",
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect(body.from).toEqual({ email: "jane@play14.org", name: "#play14 community" })
    })
  })

  describe("attachments", () => {
    it("base64-encodes each attachment and maps to Sender.net field names", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        subject: "Hi",
        attachments: [
          {
            filename: "ticket.pdf",
            content: Buffer.from("hello-pdf-bytes"),
            contentType: "application/pdf",
          },
          {
            filename: "event.ics",
            content: Buffer.from("BEGIN:VCALENDAR"),
            contentType: "text/calendar",
          },
        ],
      })

      const body = lastRequestBody(fetchFn)
      expect(body.attachments).toEqual([
        {
          name: "ticket.pdf",
          content: Buffer.from("hello-pdf-bytes").toString("base64"),
          content_type: "application/pdf",
        },
        {
          name: "event.ics",
          content: Buffer.from("BEGIN:VCALENDAR").toString("base64"),
          content_type: "text/calendar",
        },
      ])
    })

    it("omits the attachments key when no attachments are provided", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        subject: "Hi",
      })

      const body = lastRequestBody(fetchFn)
      expect("attachments" in body).toBe(false)
    })

    it("omits the attachments key when the array is empty", async () => {
      const fetchFn = mockOkFetch()
      const sender = createSender()

      await sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        subject: "Hi",
        attachments: [],
      })

      const body = lastRequestBody(fetchFn)
      expect("attachments" in body).toBe(false)
    })
  })

  describe("error handling", () => {
    it("attaches the HTTP status code on 429 responses so retry logic can detect rate limits", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve(JSON.stringify({ message: "Too many requests" })),
      }) as unknown as typeof fetch

      const sender = createSender()

      await expect(
        sender.send({
          from: "sender@play14.org",
          to: "player@example.com",
          subject: "Hi",
        })
      ).rejects.toMatchObject({
        statusCode: 429,
        responseBody: { message: "Too many requests" },
      })
    })

    it("throws with statusCode matching the response status for generic 4xx errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: "Invalid" })),
      }) as unknown as typeof fetch

      const sender = createSender()

      await expect(
        sender.send({
          from: "sender@play14.org",
          to: "player@example.com",
          subject: "Hi",
        })
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it("captures raw text when the error body is not JSON (e.g. HTML 5xx page)", async () => {
      const htmlBody = "<html><body>502 Bad Gateway</body></html>"
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve(htmlBody),
      }) as unknown as typeof fetch

      const sender = createSender()

      await expect(
        sender.send({
          from: "sender@play14.org",
          to: "player@example.com",
          subject: "Hi",
        })
      ).rejects.toMatchObject({ statusCode: 502, responseBody: htmlBody })
    })
  })

  describe("timeout", () => {
    it("aborts and throws a timeout error when the request hangs past 15s", async () => {
      vi.useFakeTimers()

      global.fetch = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal
            if (signal) {
              signal.addEventListener("abort", () => {
                const abortErr = new Error("aborted")
                ;(abortErr as Error & { name: string }).name = "AbortError"
                reject(abortErr)
              })
            }
          })
      ) as unknown as typeof fetch

      const sender = createSender()

      const pending = sender.send({
        from: "sender@play14.org",
        to: "player@example.com",
        subject: "Hi",
      })

      // Attach a rejection handler synchronously so the pending promise doesn't
      // register as unhandled while fake timers advance.
      const assertion = expect(pending).rejects.toThrow(/Sender\.net request timed out/)

      await vi.advanceTimersByTimeAsync(15_000)
      await assertion
    })
  })
})
