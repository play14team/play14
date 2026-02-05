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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 123, email: "test@example.com" }),
    })

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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 456,
          email: "test@example.com",
          firstname: "John",
        }),
    })

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
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: () =>
        Promise.resolve({
          message: "Validation failed",
          errors: { email: ["The email has already been taken"] },
        }),
    })

    const result = await addSubscriberToGroup("existing@example.com")

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: "existing@example.com" })
  })

  it("handles API error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () => Promise.resolve({ message: "Invalid email format" }),
    })

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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 789, email: "test@example.com" }),
    })

    await addSubscriberToGroup("test@example.com", "Jane")

    expect(mockStrapi.log.info).toHaveBeenCalledWith(
      "[SenderSubscribers] Added subscriber test@example.com (source: website)"
    )
  })

  it("does not include groups when SENDER_GROUP_ID is not configured", async () => {
    process.env.SENDER_GROUP_ID = undefined

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 999, email: "test@example.com" }),
    })

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
