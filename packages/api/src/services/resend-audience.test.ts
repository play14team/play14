import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addContactToAudience } from "./resend-audience"

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

describe("addContactToAudience", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = "test-api-key"
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it("returns error when RESEND_API_KEY is not configured", async () => {
    process.env.RESEND_API_KEY = undefined

    const result = await addContactToAudience("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Newsletter service is not configured")
    expect(mockStrapi.log.error).toHaveBeenCalledWith(
      "[ResendContacts] RESEND_API_KEY is not configured"
    )
  })

  it("successfully adds a contact with email only", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "contact-123", email: "test@example.com" }),
    })

    const result = await addContactToAudience("test@example.com")

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: "contact-123", email: "test@example.com" })
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        },
      })
    )
  })

  it("successfully adds a contact with firstName and source", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "contact-456",
          email: "test@example.com",
          first_name: "John",
        }),
    })

    const result = await addContactToAudience("test@example.com", "John", "footer")

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        body: JSON.stringify({
          email: "test@example.com",
          first_name: "John",
          unsubscribed: false,
          properties: { source: "footer" },
        }),
      })
    )
  })

  it("handles already existing contact (409 conflict)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: () => Promise.resolve({ message: "Contact already exists" }),
    })

    const result = await addContactToAudience("existing@example.com")

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

    const result = await addContactToAudience("invalid-email")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Invalid email format")
    expect(mockStrapi.log.warn).toHaveBeenCalled()
  })

  it("handles network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const result = await addContactToAudience("test@example.com")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Failed to connect to newsletter service")
    expect(mockStrapi.log.error).toHaveBeenCalledWith(
      "[ResendContacts] Error adding contact: Network error"
    )
  })

  it("does not include properties when source is not provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "contact-789", email: "test@example.com" }),
    })

    await addContactToAudience("test@example.com", "Jane")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/contacts",
      expect.objectContaining({
        body: JSON.stringify({
          email: "test@example.com",
          first_name: "Jane",
          unsubscribed: false,
          properties: undefined,
        }),
      })
    )
  })
})
