import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { decideReconciliation } from "./cron/newsletter-reconciliation"
import { getGroupSubscriberCount, sendBroadcast, sendTestEmail } from "./sender-broadcast"

// Mock global strapi
const mockStrapi = {
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}

// @ts-expect-error - mocking global strapi
global.strapi = mockStrapi

/**
 * Build a fake Response. Tracks how many times `json()` has been invoked so
 * we can assert the regression fix (no double-read on the error path).
 */
function fakeResponse(init: {
  ok: boolean
  status?: number
  statusText?: string
  jsonBody?: unknown
  jsonError?: Error
  text?: string
}) {
  const jsonSpy = vi.fn(() =>
    init.jsonError ? Promise.reject(init.jsonError) : Promise.resolve(init.jsonBody ?? {})
  )
  const textSpy = vi.fn(() => Promise.resolve(init.text ?? ""))
  const response: any = {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: init.statusText ?? "",
    json: jsonSpy,
    text: textSpy,
  }
  // `safeJson` uses `response.clone().json()` so the original body stream is
  // not consumed. Mirror that: clone() returns a sibling with the SAME spies
  // so tests can count how often the caller read the body.
  response.clone = () => response
  return { response, jsonSpy, textSpy }
}

describe("getGroupSubscriberCount", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.SENDER_API_KEY = "test-api-key"
    process.env.SENDER_GROUP_ID = "group-123"
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it("returns the active subscriber count on success", async () => {
    const { response } = fakeResponse({
      ok: true,
      jsonBody: {
        data: {
          id: "group-123",
          title: "Newsletter",
          active_subscribers_count: 42,
          subscribers_count: 50,
        },
      },
    })
    global.fetch = vi.fn().mockResolvedValue(response)

    const result = await getGroupSubscriberCount()

    expect(result).toEqual({ success: true, count: 42 })
  })

  it("returns an error when the API responds non-OK (regression: reads body once)", async () => {
    const { response, jsonSpy } = fakeResponse({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      jsonBody: { message: "Internal error" },
    })
    global.fetch = vi.fn().mockResolvedValue(response)

    const result = await getGroupSubscriberCount()

    expect(result.success).toBe(false)
    expect(result.error).toBe("Internal error")
    // Regression: the original implementation called response.json() twice
    // (once for the error branch, once for the ok branch). Assert we never
    // read the body more than once per response.
    expect(jsonSpy).toHaveBeenCalledTimes(1)
  })

  it("handles a non-JSON error body without throwing", async () => {
    const { response } = fakeResponse({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      jsonError: new SyntaxError("Unexpected token <"),
      text: "<html>502 bad gateway</html>",
    })
    global.fetch = vi.fn().mockResolvedValue(response)

    const result = await getGroupSubscriberCount()

    expect(result.success).toBe(false)
    expect(result.error).toContain("Sender.net error")
  })
})

describe("sendBroadcast", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.SENDER_API_KEY = "test-api-key"
    process.env.SENDER_GROUP_ID = "group-123"
    process.env.EMAIL_REPLY_TO = "community@play14.org"
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it("passes the parsed display NAME (not email) as `from` and the email as `reply_to`", async () => {
    process.env.EMAIL_DEFAULT_FROM = "noreply@play14.org"
    process.env.EMAIL_DEFAULT_FROM_NAME = "#play14 community"
    process.env.EMAIL_REPLY_TO = "community@play14.org"

    const createResp = fakeResponse({
      ok: true,
      jsonBody: { data: { id: "campaign-1" } },
    })
    const sendResp = fakeResponse({ ok: true, jsonBody: {} })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResp.response)
      .mockResolvedValueOnce(sendResp.response)
    global.fetch = fetchMock

    const result = await sendBroadcast("Hello world", "<p>hi</p>")

    expect(result).toEqual({ success: true, broadcastId: "campaign-1" })

    // First call is POST /v2/campaigns — inspect the body.
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.sender.net/v2/campaigns")
    const body = JSON.parse(init.body)
    // Regression: `from` must be the display NAME, not the email. The
    // Sender.net campaign API treats `from` as the human-readable sender
    // name; the email address is set per verified domain and surfaced via
    // reply_to.
    expect(body.from).toBe("#play14 community")
    expect(body.from).not.toMatch(/@/)
    expect(body.reply_to).toBe("community@play14.org")
    expect(body.subject).toBe("Hello world")
    expect(body.title).toBe("Hello world")
  })

  it("parses EMAIL_DEFAULT_FROM in 'Name <email>' format correctly", async () => {
    process.env.EMAIL_DEFAULT_FROM = "Alice Example <alice@example.org>"

    const createResp = fakeResponse({
      ok: true,
      jsonBody: { data: { id: "campaign-2" } },
    })
    const sendResp = fakeResponse({ ok: true, jsonBody: {} })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResp.response)
      .mockResolvedValueOnce(sendResp.response)
    global.fetch = fetchMock

    await sendBroadcast("Subj", "<p>body</p>")

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.from).toBe("Alice Example")
  })

  it("does not call /send when campaign creation fails", async () => {
    const createResp = fakeResponse({
      ok: false,
      status: 400,
      jsonBody: { message: "Bad request" },
    })
    const fetchMock = vi.fn().mockResolvedValueOnce(createResp.response)
    global.fetch = fetchMock

    const result = await sendBroadcast("Subj", "<p>body</p>")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Bad request")
    expect(fetchMock).toHaveBeenCalledTimes(1) // no second call to /send
  })

  it("does not call /send when create returns no campaign id", async () => {
    const createResp = fakeResponse({
      ok: true,
      jsonBody: { data: {} }, // no id
    })
    const fetchMock = vi.fn().mockResolvedValueOnce(createResp.response)
    global.fetch = fetchMock

    const result = await sendBroadcast("Subj", "<p>body</p>")

    expect(result.success).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("calls /send after a successful create with a campaign id", async () => {
    const createResp = fakeResponse({
      ok: true,
      jsonBody: { data: { id: "campaign-3" } },
    })
    const sendResp = fakeResponse({ ok: true, jsonBody: {} })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResp.response)
      .mockResolvedValueOnce(sendResp.response)
    global.fetch = fetchMock

    const result = await sendBroadcast("Subj", "<p>body</p>")

    expect(result).toEqual({ success: true, broadcastId: "campaign-3" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.sender.net/v2/campaigns/campaign-3/send")
  })
})

describe("sendTestEmail", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.SENDER_API_KEY = "test-api-key"
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it("sends with parsed `from: { email, name }` from plain email env", async () => {
    process.env.EMAIL_DEFAULT_FROM = "noreply@play14.org"
    delete process.env.EMAIL_DEFAULT_FROM_NAME

    const { response } = fakeResponse({ ok: true, jsonBody: {} })
    const fetchMock = vi.fn().mockResolvedValue(response)
    global.fetch = fetchMock

    const result = await sendTestEmail("user@example.com", "Hi", "<p>hi</p>")

    expect(result).toEqual({ success: true })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.from).toEqual({ email: "noreply@play14.org", name: "#play14 community" })
    expect(body.to).toEqual({ email: "user@example.com" })
    expect(body.subject).toBe("[TEST] Hi")
  })

  it("sends with parsed `from: { email, name }` from 'Name <email>' env", async () => {
    process.env.EMAIL_DEFAULT_FROM = "Play14 <hello@play14.org>"

    const { response } = fakeResponse({ ok: true, jsonBody: {} })
    const fetchMock = vi.fn().mockResolvedValue(response)
    global.fetch = fetchMock

    await sendTestEmail("user@example.com", "Hi", "<p>hi</p>")

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.from).toEqual({ email: "hello@play14.org", name: "Play14" })
  })

  it("surfaces an error on non-OK response", async () => {
    const { response } = fakeResponse({
      ok: false,
      status: 400,
      jsonBody: { message: "Bad request" },
    })
    global.fetch = vi.fn().mockResolvedValue(response)

    const result = await sendTestEmail("user@example.com", "Hi", "<p>hi</p>")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Bad request")
  })
})

describe("decideReconciliation", () => {
  it("marks as sent when status is SENT (no sent_time)", () => {
    const decision = decideReconciliation(
      { httpStatus: 200, body: { data: { status: "SENT" } } },
      new Date("2026-04-19T12:00:00.000Z")
    )
    expect(decision).toEqual({
      action: "mark-sent",
      sendStatus: "sent",
      sentAt: "2026-04-19T12:00:00.000Z",
    })
  })

  it("marks as sent when sent_time is populated regardless of status", () => {
    const decision = decideReconciliation({
      httpStatus: 200,
      body: { data: { status: "DRAFT", sent_time: "2026-04-18T10:00:00Z" } },
    })
    expect(decision.action).toBe("mark-sent")
    expect(decision.sendStatus).toBe("sent")
    expect(decision.sentAt).toBe("2026-04-18T10:00:00Z")
  })

  it("returns wait when status is SENDING / QUEUED / PROCESSING", () => {
    for (const status of ["SENDING", "QUEUED", "PROCESSING"]) {
      expect(decideReconciliation({ httpStatus: 200, body: { data: { status } } }).action).toBe(
        "wait"
      )
    }
  })

  it("marks as failed when status is DRAFT and no sent_time", () => {
    const decision = decideReconciliation({
      httpStatus: 200,
      body: { data: { status: "DRAFT" } },
    })
    expect(decision.action).toBe("mark-failed")
    expect(decision.errorMessage).toContain("DRAFT")
  })

  it("marks as failed on 404", () => {
    const decision = decideReconciliation({ httpStatus: 404, body: { message: "not found" } })
    expect(decision.action).toBe("mark-failed")
    expect(decision.errorMessage).toContain("404")
  })

  it("marks as failed when campaign id is missing", () => {
    const decision = decideReconciliation({ missingCampaignId: true })
    expect(decision.action).toBe("mark-failed")
    expect(decision.errorMessage).toBe("stuck in sending without campaign id")
  })

  it("returns wait on transient 5xx errors", () => {
    const decision = decideReconciliation({ httpStatus: 500, body: { message: "boom" } })
    expect(decision.action).toBe("wait")
  })
})
