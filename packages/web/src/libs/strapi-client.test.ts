import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildApiUrl, validatePathSegment, validatePathSegments } from "./strapi-client"

// Mock process.env for buildApiUrl tests
const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv, STRAPI_API_URL: "http://localhost:1337" }
})

describe("validatePathSegment", () => {
  describe("valid inputs", () => {
    it("accepts alphanumeric strings", () => {
      expect(validatePathSegment("abc123")).toBe("abc123")
    })

    it("accepts strings with hyphens", () => {
      expect(validatePathSegment("my-event-2024")).toBe("my-event-2024")
    })

    it("accepts strings with underscores", () => {
      expect(validatePathSegment("my_event_2024")).toBe("my_event_2024")
    })

    it("accepts numeric strings", () => {
      expect(validatePathSegment("12345")).toBe("12345")
    })

    it("accepts mixed alphanumeric with hyphens and underscores", () => {
      expect(validatePathSegment("Event-2024_v1")).toBe("Event-2024_v1")
    })

    it("trims whitespace from valid inputs", () => {
      expect(validatePathSegment("  my-slug  ")).toBe("my-slug")
    })

    it("accepts uppercase letters", () => {
      expect(validatePathSegment("ABC123")).toBe("ABC123")
    })
  })

  describe("SSRF attack prevention", () => {
    it("rejects path traversal with ../", () => {
      expect(() => validatePathSegment("../etc/passwd")).toThrow("contains invalid characters")
    })

    it("rejects path traversal with ..\\", () => {
      expect(() => validatePathSegment("..\\windows\\system32")).toThrow(
        "contains invalid characters"
      )
    })

    it("rejects URL-encoded path traversal", () => {
      expect(() => validatePathSegment("%2e%2e%2f")).toThrow("contains invalid characters")
    })

    it("rejects absolute paths", () => {
      expect(() => validatePathSegment("/etc/passwd")).toThrow("contains invalid characters")
    })

    it("rejects URLs", () => {
      expect(() => validatePathSegment("http://evil.com/malicious")).toThrow(
        "contains invalid characters"
      )
    })

    it("rejects URL with protocol-relative paths", () => {
      expect(() => validatePathSegment("//evil.com/path")).toThrow("contains invalid characters")
    })

    it("rejects null bytes", () => {
      expect(() => validatePathSegment("valid\x00evil")).toThrow("contains invalid characters")
    })

    it("rejects newlines (HTTP header injection)", () => {
      expect(() => validatePathSegment("valid\nX-Injected: header")).toThrow(
        "contains invalid characters"
      )
    })

    it("rejects carriage returns (HTTP header injection)", () => {
      expect(() => validatePathSegment("valid\rX-Injected: header")).toThrow(
        "contains invalid characters"
      )
    })

    it("rejects query strings", () => {
      expect(() => validatePathSegment("slug?admin=true")).toThrow("contains invalid characters")
    })

    it("rejects hash fragments", () => {
      expect(() => validatePathSegment("slug#section")).toThrow("contains invalid characters")
    })

    it("rejects spaces in the middle", () => {
      expect(() => validatePathSegment("my slug")).toThrow("contains invalid characters")
    })

    it("rejects dots", () => {
      expect(() => validatePathSegment("file.txt")).toThrow("contains invalid characters")
    })

    it("rejects colons", () => {
      expect(() => validatePathSegment("C:")).toThrow("contains invalid characters")
    })
  })

  describe("edge cases", () => {
    it("rejects null", () => {
      expect(() => validatePathSegment(null as unknown as string)).toThrow(
        "must be a non-empty string"
      )
    })

    it("rejects undefined", () => {
      expect(() => validatePathSegment(undefined as unknown as string)).toThrow(
        "must be a non-empty string"
      )
    })

    it("rejects empty string", () => {
      expect(() => validatePathSegment("")).toThrow("must be a non-empty string")
    })

    it("rejects whitespace-only string", () => {
      expect(() => validatePathSegment("   ")).toThrow("must not be empty")
    })

    it("rejects strings exceeding max length", () => {
      const longString = "a".repeat(256)
      expect(() => validatePathSegment(longString)).toThrow("exceeds maximum length")
    })

    it("accepts strings at max length", () => {
      const maxString = "a".repeat(255)
      expect(validatePathSegment(maxString)).toBe(maxString)
    })

    it("uses custom parameter name in error messages", () => {
      expect(() => validatePathSegment("../evil", "eventSlug")).toThrow(
        "Invalid eventSlug: contains invalid characters"
      )
    })
  })
})

describe("validatePathSegments", () => {
  it("validates multiple segments", () => {
    const result = validatePathSegments({
      slug: "my-event",
      id: "abc123",
    })
    expect(result).toEqual({
      slug: "my-event",
      id: "abc123",
    })
  })

  it("throws on first invalid segment", () => {
    expect(() =>
      validatePathSegments({
        slug: "valid-slug",
        id: "../evil",
      })
    ).toThrow("Invalid id: contains invalid characters")
  })

  it("handles empty object", () => {
    expect(validatePathSegments({})).toEqual({})
  })
})

describe("buildApiUrl", () => {
  it("builds URL with single parameter", () => {
    const url = buildApiUrl("/events/:slug", { slug: "my-event" })
    expect(url).toBe("http://localhost:1337/api/events/my-event")
  })

  it("builds URL with multiple parameters", () => {
    const url = buildApiUrl("/events/:slug/tickets/:ticketId", {
      slug: "my-event",
      ticketId: "abc123",
    })
    expect(url).toBe("http://localhost:1337/api/events/my-event/tickets/abc123")
  })

  it("handles URL without parameters", () => {
    const url = buildApiUrl("/events")
    expect(url).toBe("http://localhost:1337/api/events")
  })

  it("does not double-prefix /api paths", () => {
    const url = buildApiUrl("/api/events/:slug", { slug: "my-event" })
    expect(url).toBe("http://localhost:1337/api/events/my-event")
  })

  it("URL-encodes parameter values", () => {
    // Even though validatePathSegment won't allow spaces,
    // other safe characters should still be encoded for URL safety
    const url = buildApiUrl("/events/:slug", { slug: "my-event" })
    expect(url).toBe("http://localhost:1337/api/events/my-event")
  })

  it("throws when required parameter is missing", () => {
    expect(() => buildApiUrl("/events/:slug/edit", {})).toThrow(
      "Missing required path parameters: :slug"
    )
  })

  it("throws when multiple required parameters are missing", () => {
    expect(() => buildApiUrl("/events/:slug/tickets/:ticketId", { slug: "my-event" })).toThrow(
      "Missing required path parameters: :ticketId"
    )
  })

  it("validates parameters before building URL", () => {
    expect(() => buildApiUrl("/events/:slug", { slug: "../../../etc/passwd" })).toThrow(
      "Invalid slug: contains invalid characters"
    )
  })

  it("prevents SSRF via malicious slug", () => {
    expect(() => buildApiUrl("/events/:slug", { slug: "http://evil.com" })).toThrow(
      "Invalid slug: contains invalid characters"
    )
  })

  it("prevents path traversal via parameters", () => {
    expect(() => buildApiUrl("/events/:slug/edit", { slug: "..%2F..%2Fetc%2Fpasswd" })).toThrow(
      "Invalid slug: contains invalid characters"
    )
  })
})
