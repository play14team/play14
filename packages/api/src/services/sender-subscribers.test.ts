import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addSubscriberToGroup } from "./sender-subscribers"

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

// Build a minimal fake Response that satisfies the shape safeJson expects
// (it calls `response.clone().json()` to avoid body-consumed errors).
function fakeResponse(init: {
  ok: boolean
  status?: number
  statusText?: string
  json?: () => Promise<unknown>
  text?: () => Promise<string>
}) {
  const response: any = {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: init.statusText ?? "",
    json: init.json ?? (() => Promise.resolve({})),
    text: init.text ?? (() => Promise.resolve("")),
  }
  response.clone = () => response
  return response
}

describe("addSubscriberToGroup", () => {
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

  it("returns error when SENDER_API_KEY is not configured", async () => {
    process.env.SENDER_API_KEY = undefined

    const result = await addSubscriberToGroup("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Newsletter service is not configured")
    expect(mockStrapi.log.error).toHaveBeenCalledWith(
      "[SenderSubscribers] SENDER_API_KEY is not configured"
    )
  })

  it("successfully adds a subscriber with email only", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: true,
        json: () => Promise.resolve({ id: 123, email: "test@example.com" }),
      })
    )

    const result = await addSubscriberToGroup("test@example.com")

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 123, email: "test@example.com" })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.sender.net/v2/subscribers",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          trigger_automation: false,
          groups: ["group-123"],
        }),
      })
    )
  })

  it("successfully adds a subscriber with firstName and source", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 456,
            email: "test@example.com",
            firstname: "John",
          }),
      })
    )

    const result = await addSubscriberToGroup("test@example.com", "John", "footer")

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.sender.net/v2/subscribers",
      expect.objectContaining({
        body: JSON.stringify({
          email: "test@example.com",
          trigger_automation: false,
          firstname: "John",
          groups: ["group-123"],
        }),
      })
    )
  })

  it("handles already existing subscriber (422 with 'already' message)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: () =>
          Promise.resolve({
            message: "Validation failed",
            errors: { email: ["The email has already been taken"] },
          }),
      })
    )

    const result = await addSubscriberToGroup("existing@example.com")

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: "existing@example.com" })
  })

  it("treats 'already exists' as duplicate subscriber", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: () =>
          Promise.resolve({
            message: "Validation failed",
            errors: { email: ["Subscriber already exists"] },
          }),
      })
    )

    const result = await addSubscriberToGroup("existing@example.com")

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: "existing@example.com" })
  })

  it("does NOT treat 'already in review' as a duplicate subscriber", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: () =>
          Promise.resolve({
            message: "Validation failed",
            errors: { email: ["Domain already in review"] },
          }),
      })
    )

    const result = await addSubscriberToGroup("review@example.com")

    // Regression: prior substring-based "already" check would incorrectly
    // swallow this as success.
    expect(result.success).toBe(false)
    expect(result.error).toBe("Validation failed")
  })

  it("handles timeout (AbortError) gracefully", async () => {
    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    global.fetch = vi.fn().mockRejectedValue(abortError)

    const result = await addSubscriberToGroup("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Sender.net request timed out")
    expect(mockStrapi.log.error).toHaveBeenCalled()
  })

  it("handles non-JSON error body without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON")),
        text: () => Promise.resolve("<html><body>502 Bad Gateway</body></html>"),
      })
    )

    const result = await addSubscriberToGroup("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toContain("Sender.net error")
    expect(mockStrapi.log.warn).toHaveBeenCalled()
  })

  it("handles API error response", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({ message: "Invalid email format" }),
      })
    )

    const result = await addSubscriberToGroup("invalid-email")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Invalid email format")
    expect(mockStrapi.log.warn).toHaveBeenCalled()
  })

  it("handles network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const result = await addSubscriberToGroup("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Failed to connect to newsletter service")
    expect(mockStrapi.log.error).toHaveBeenCalledWith(
      "[SenderSubscribers] Error adding subscriber: Network error"
    )
  })

  it("uses default source 'website' when source is not provided", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: true,
        json: () => Promise.resolve({ id: 789, email: "test@example.com" }),
      })
    )

    await addSubscriberToGroup("test@example.com", "Jane")

    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      "[SenderSubscribers] Added subscriber test@example.com (source: website)"
    )
  })

  it("does not include groups when SENDER_GROUP_ID is not configured", async () => {
    process.env.SENDER_GROUP_ID = undefined

    global.fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: true,
        json: () => Promise.resolve({ id: 999, email: "test@example.com" }),
      })
    )

    await addSubscriberToGroup("test@example.com")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.sender.net/v2/subscribers",
      expect.objectContaining({
        body: JSON.stringify({
          email: "test@example.com",
          trigger_automation: false,
        }),
      })
    )
  })
})
