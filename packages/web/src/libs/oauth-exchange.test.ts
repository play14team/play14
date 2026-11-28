import { describe, expect, it, vi } from "vitest"
import { exchangeOAuthSession, isOAuthProvider, mapStrapiOAuthError } from "./oauth-exchange"

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("isOAuthProvider", () => {
  it("accepts the configured providers", () => {
    for (const p of ["google", "microsoft", "github", "linkedin"]) {
      expect(isOAuthProvider(p)).toBe(true)
    }
  })

  it("rejects anything else", () => {
    expect(isOAuthProvider("local")).toBe(false)
    expect(isOAuthProvider("../users/me")).toBe(false)
  })
})

describe("mapStrapiOAuthError", () => {
  it("maps a duplicate email", () => {
    expect(mapStrapiOAuthError("Email is already taken")).toBe("email_taken")
  })

  it("maps a missing provider session to no_token", () => {
    expect(mapStrapiOAuthError("OAuth authentication requires a completed provider session")).toBe(
      "no_token"
    )
  })

  it("falls back to token_exchange_failed", () => {
    expect(mapStrapiOAuthError(undefined)).toBe("token_exchange_failed")
    expect(mapStrapiOAuthError("boom")).toBe("token_exchange_failed")
  })
})

describe("exchangeOAuthSession", () => {
  it("calls the Strapi callback with credentials and returns the JWT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { jwt: "abc", user: {} }))

    const result = await exchangeOAuthSession("https://api.example.org", "google", fetchImpl)

    expect(result).toEqual({ ok: true, jwt: "abc" })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.org/api/auth/google/callback",
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("maps a Strapi error response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        error: { message: "OAuth authentication requires a completed provider session" },
      })
    )

    const result = await exchangeOAuthSession("https://api.example.org", "google", fetchImpl)

    expect(result).toEqual({ ok: false, error: "no_token" })
  })

  it("fails when the response has no JWT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { user: {} }))

    const result = await exchangeOAuthSession("https://api.example.org", "github", fetchImpl)

    expect(result).toEqual({ ok: false, error: "token_exchange_failed" })
  })

  it("fails on a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))

    const result = await exchangeOAuthSession("https://api.example.org", "linkedin", fetchImpl)

    expect(result).toEqual({ ok: false, error: "token_exchange_failed" })
  })
})
