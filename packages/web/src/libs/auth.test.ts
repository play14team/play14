import { describe, expect, it, vi } from "vitest"
import { getOAuthCallbackUrl, getOAuthConnectUrl, type OAuthProvider } from "./auth"

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

describe("OAuth URL generation", () => {
  describe("getOAuthConnectUrl", () => {
    it("should generate correct URL for Google provider", () => {
      const url = getOAuthConnectUrl("google")
      expect(url).toContain("/api/connect/google")
    })

    it("should generate correct URL for Microsoft provider", () => {
      const url = getOAuthConnectUrl("microsoft")
      expect(url).toContain("/api/connect/microsoft")
    })

    it("should generate correct URL for GitHub provider", () => {
      const url = getOAuthConnectUrl("github")
      expect(url).toContain("/api/connect/github")
    })

    it("should generate correct URL for LinkedIn provider", () => {
      const url = getOAuthConnectUrl("linkedin")
      expect(url).toContain("/api/connect/linkedin")
    })

    it("should include the Strapi API base URL", () => {
      const url = getOAuthConnectUrl("google")
      // Should either use the env var or default to localhost
      expect(url).toMatch(/^https?:\/\/.+\/api\/connect\/google$/)
    })
  })

  describe("getOAuthCallbackUrl", () => {
    it("should generate correct callback URL for Google", () => {
      const url = getOAuthCallbackUrl("google")
      expect(url).toContain("/connect/google/redirect")
    })

    it("should generate correct callback URL for Microsoft", () => {
      const url = getOAuthCallbackUrl("microsoft")
      expect(url).toContain("/connect/microsoft/redirect")
    })

    it("should generate correct callback URL for GitHub", () => {
      const url = getOAuthCallbackUrl("github")
      expect(url).toContain("/connect/github/redirect")
    })

    it("should generate correct callback URL for LinkedIn", () => {
      const url = getOAuthCallbackUrl("linkedin")
      expect(url).toContain("/connect/linkedin/redirect")
    })

    it("should include the frontend base URL", () => {
      const url = getOAuthCallbackUrl("google")
      // Should either use the env var or default to localhost
      expect(url).toMatch(/^https?:\/\/.+\/connect\/google\/redirect$/)
    })
  })

  describe("OAuth provider type safety", () => {
    it("should handle all supported OAuth providers", () => {
      const providers: OAuthProvider[] = ["google", "microsoft", "github", "linkedin"]

      providers.forEach((provider) => {
        const connectUrl = getOAuthConnectUrl(provider)
        const callbackUrl = getOAuthCallbackUrl(provider)

        expect(connectUrl).toContain(`/api/connect/${provider}`)
        expect(callbackUrl).toContain(`/connect/${provider}/redirect`)
      })
    })
  })
})
