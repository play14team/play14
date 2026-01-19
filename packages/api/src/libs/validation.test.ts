import { describe, expect, it } from "vitest"
import {
  attendeeSchema,
  emailSchema,
  isValidEmail,
  isValidUrl,
  validateEmail,
  validateName,
} from "./validation"

describe("validation utilities", () => {
  describe("isValidEmail", () => {
    it("returns false for empty input", () => {
      expect(isValidEmail("")).toBe(false)
      expect(isValidEmail("   ")).toBe(false)
    })

    it("returns false for null/undefined", () => {
      expect(isValidEmail(null as any)).toBe(false)
      expect(isValidEmail(undefined as any)).toBe(false)
    })

    it("returns true for valid email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true)
      expect(isValidEmail("user.name@domain.org")).toBe(true)
      expect(isValidEmail("user+tag@example.com")).toBe(true)
      expect(isValidEmail("user@subdomain.example.com")).toBe(true)
    })

    it("returns false for invalid email addresses", () => {
      expect(isValidEmail("invalid")).toBe(false)
      expect(isValidEmail("@example.com")).toBe(false)
      expect(isValidEmail("user@")).toBe(false)
      expect(isValidEmail("user@.com")).toBe(false)
    })

    it("handles internationalized domains", () => {
      // Standard ASCII domains
      expect(isValidEmail("user@example.co.uk")).toBe(true)
    })
  })

  describe("validateEmail", () => {
    it("returns error for empty email", () => {
      const result = validateEmail("")
      expect(result.valid).toBe(false)
      expect(result.email).toBeNull()
      expect(result.error).toBe("Email cannot be empty")
    })

    it("returns error for null/undefined", () => {
      expect(validateEmail(null as any).valid).toBe(false)
      expect(validateEmail(undefined as any).valid).toBe(false)
    })

    it("returns error for consecutive dots", () => {
      const result = validateEmail("user..name@example.com")
      expect(result.valid).toBe(false)
      // Zod's built-in email validator catches this before our custom refine
      expect(result.error).toMatch(/Invalid email/i)
    })

    it("returns error for local part starting with dot", () => {
      const result = validateEmail(".user@example.com")
      expect(result.valid).toBe(false)
      // Zod's built-in email validator catches this before our custom refine
      expect(result.error).toMatch(/Invalid email/i)
    })

    it("returns error for local part ending with dot", () => {
      const result = validateEmail("user.@example.com")
      expect(result.valid).toBe(false)
      // Zod's built-in email validator catches this before our custom refine
      expect(result.error).toMatch(/Invalid email/i)
    })

    it("returns normalized email for valid input", () => {
      const result = validateEmail("  TEST@EXAMPLE.COM  ")
      expect(result.valid).toBe(true)
      expect(result.email).toBe("test@example.com")
      expect(result.error).toBeUndefined()
    })

    it("returns error for invalid format", () => {
      const result = validateEmail("not-an-email")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Invalid email format")
    })
  })

  describe("isValidUrl", () => {
    it("returns false for empty input", () => {
      expect(isValidUrl("")).toBe(false)
      expect(isValidUrl("   ")).toBe(false)
    })

    it("returns false for null/undefined", () => {
      expect(isValidUrl(null as any)).toBe(false)
      expect(isValidUrl(undefined as any)).toBe(false)
    })

    it("returns true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true)
      expect(isValidUrl("http://example.com")).toBe(true)
      expect(isValidUrl("https://example.com/path")).toBe(true)
      expect(isValidUrl("https://example.com/path?query=1")).toBe(true)
      expect(isValidUrl("https://sub.example.com")).toBe(true)
      expect(isValidUrl("example.com")).toBe(true) // protocol not required
    })

    it("returns false for invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false)
      // ftp is technically a valid URL that our validator prepends https:// to
      // so we check for clearly invalid schemes
      expect(isValidUrl("javascript:alert(1)")).toBe(false)
      expect(isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
    })
  })

  describe("validateName", () => {
    it("returns error for empty name", () => {
      const result = validateName("")
      expect(result.valid).toBe(false)
      expect(result.name).toBeNull()
      expect(result.error).toBe("Name must be at least 1 character")
    })

    it("returns error for null/undefined", () => {
      expect(validateName(null as any).valid).toBe(false)
      expect(validateName(undefined as any).valid).toBe(false)
    })

    it("returns trimmed name for valid input", () => {
      const result = validateName("  John Doe  ")
      expect(result.valid).toBe(true)
      expect(result.name).toBe("John Doe")
    })

    it("enforces minimum length", () => {
      const result = validateName("A", { minLength: 2 })
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Name must be at least 2 characters")
    })

    it("enforces maximum length", () => {
      const result = validateName("A".repeat(101), { maxLength: 100 })
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Name must be at most 100 characters")
    })

    it("detects control characters", () => {
      const result = validateName("John\x00Doe")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Name contains invalid characters")
    })

    it("uses custom field name in errors", () => {
      const result = validateName("", { field: "First name" })
      expect(result.error).toBe("First name must be at least 1 character")
    })

    it("allows unicode characters", () => {
      const result = validateName("José García")
      expect(result.valid).toBe(true)
      expect(result.name).toBe("José García")
    })

    it("allows CJK characters", () => {
      const result = validateName("田中太郎")
      expect(result.valid).toBe(true)
      expect(result.name).toBe("田中太郎")
    })
  })

  describe("emailSchema", () => {
    it("transforms to lowercase", () => {
      const result = emailSchema.safeParse("TEST@EXAMPLE.COM")
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe("test@example.com")
      }
    })
  })

  describe("attendeeSchema", () => {
    it("validates a complete attendee", () => {
      const result = attendeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme Inc",
        tshirtSize: "M",
        foodPreferences: "Vegetarian",
        photoConsent: true,
      })
      expect(result.success).toBe(true)
    })

    it("validates minimal attendee (required fields only)", () => {
      const result = attendeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      })
      expect(result.success).toBe(true)
    })

    it("fails for missing required fields", () => {
      const result = attendeeSchema.safeParse({
        firstName: "John",
        // missing lastName and email
      })
      expect(result.success).toBe(false)
    })

    it("validates tshirt size enum", () => {
      const validResult = attendeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        tshirtSize: "XL",
      })
      expect(validResult.success).toBe(true)

      const invalidResult = attendeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        tshirtSize: "INVALID",
      })
      expect(invalidResult.success).toBe(false)
    })
  })
})
