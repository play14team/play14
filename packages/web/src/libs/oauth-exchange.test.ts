import { describe, expect, it, vi } from "vitest"
import {
  completeOAuthRedirect,
  exchangeOAuthSession,
  isOAuthProvider,
  mapStrapiOAuthError,
} from "./oauth-exchange"

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

describe("completeOAuthRedirect", () => {
  function deps(overrides: Partial<Parameters<typeof completeOAuthRedirect>[2]> = {}) {
    return {
      exchange: vi.fn().mockResolvedValue({ ok: true, jwt: "abc" }),
      storeSession: vi.fn().mockResolvedValue(true),
      logError: vi.fn(),
      ...overrides,
    }
  }

  it("goes to /auth/callback after a successful exchange", async () => {
    const d = deps()
    await expect(completeOAuthRedirect("google", "", d)).resolves.toBe("/auth/callback")
    expect(d.exchange).toHaveBeenCalledWith("google")
    expect(d.storeSession).toHaveBeenCalledWith("abc")
  })

  it("forwards a provider error without calling Strapi", async () => {
    const d = deps()
    const path = await completeOAuthRedirect("google", "?error=access_denied", d)
    expect(path).toBe("/auth/error?error=access_denied")
    expect(d.exchange).not.toHaveBeenCalled()
  })

  it("encodes the provider error code", async () => {
    const path = await completeOAuthRedirect("google", "?error=a%26b%3Dc", deps())
    expect(path).toBe("/auth/error?error=a%26b%3Dc")
  })

  it("truncates a long error_description before logging it", async () => {
    const logError = vi.fn()
    await completeOAuthRedirect(
      "google",
      `?error=x&error_description=${"a".repeat(5000)}`,
      deps({ logError })
    )
    const logged = logError.mock.calls[0][2] as string
    expect(logged.length).toBe(200)
  })

  it("rejects an unknown provider without calling Strapi", async () => {
    const d = deps()
    const path = await completeOAuthRedirect("evil", "", d)
    expect(path).toBe("/auth/error?error=token_exchange_failed")
    expect(d.exchange).not.toHaveBeenCalled()
  })

  it("surfaces the exchange error code", async () => {
    const d = deps({ exchange: vi.fn().mockResolvedValue({ ok: false, error: "no_token" }) })
    await expect(completeOAuthRedirect("google", "", d)).resolves.toBe("/auth/error?error=no_token")
    expect(d.storeSession).not.toHaveBeenCalled()
  })

  it("fails when the session cookie could not be stored", async () => {
    const d = deps({ storeSession: vi.fn().mockResolvedValue(false) })
    await expect(completeOAuthRedirect("google", "", d)).resolves.toBe(
      "/auth/error?error=token_exchange_failed"
    )
  })

  it("fails when storing the session throws", async () => {
    const d = deps({ storeSession: vi.fn().mockRejectedValue(new TypeError("offline")) })
    await expect(completeOAuthRedirect("google", "", d)).resolves.toBe(
      "/auth/error?error=token_exchange_failed"
    )
  })
})
