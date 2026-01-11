/**
 * Unit tests for general utilities
 */

import { describe, it, expect } from "vitest"
import { capitalizeFirstLetter } from "./utils"

describe("capitalizeFirstLetter", () => {
  describe("basic functionality", () => {
    it("capitalizes first letter of lowercase word", () => {
      expect(capitalizeFirstLetter("hello")).toBe("Hello")
    })

    it("keeps rest of string unchanged", () => {
      expect(capitalizeFirstLetter("hELLO")).toBe("HELLO")
    })

    it("handles already capitalized string", () => {
      expect(capitalizeFirstLetter("Hello")).toBe("Hello")
    })

    it("capitalizes first letter of sentence", () => {
      expect(capitalizeFirstLetter("hello world")).toBe("Hello world")
    })
  })

  describe("edge cases", () => {
    it("returns empty string for undefined", () => {
      expect(capitalizeFirstLetter(undefined)).toBe("")
    })

    it("returns empty string for empty string", () => {
      expect(capitalizeFirstLetter("")).toBe("")
    })

    it("handles single character", () => {
      expect(capitalizeFirstLetter("a")).toBe("A")
    })

    it("handles single uppercase character", () => {
      expect(capitalizeFirstLetter("A")).toBe("A")
    })
  })

  describe("special characters", () => {
    it("handles string starting with number", () => {
      expect(capitalizeFirstLetter("123abc")).toBe("123abc")
    })

    it("handles string starting with special character", () => {
      expect(capitalizeFirstLetter("@hello")).toBe("@hello")
    })

    it("handles string with spaces at start", () => {
      expect(capitalizeFirstLetter(" hello")).toBe(" hello")
    })

    it("handles accented characters", () => {
      expect(capitalizeFirstLetter("école")).toBe("École")
    })
  })

  describe("real-world examples", () => {
    it("capitalizes player names", () => {
      expect(capitalizeFirstLetter("john")).toBe("John")
    })

    it("capitalizes event types", () => {
      expect(capitalizeFirstLetter("unconference")).toBe("Unconference")
    })

    it("capitalizes city names", () => {
      expect(capitalizeFirstLetter("paris")).toBe("Paris")
    })
  })
})
