/**
 * Unit tests for camelPad utility
 */

import { describe, expect, it } from "vitest"
import { camelPad } from "./camelPad"

describe("camelPad", () => {
  describe("basic camelCase conversion", () => {
    it("converts simple camelCase to spaced words", () => {
      expect(camelPad("helloWorld")).toBe("Hello World")
    })

    it("converts multiple camelCase words", () => {
      expect(camelPad("thisIsATest")).toBe("This Is A Test")
    })

    it("handles single word", () => {
      expect(camelPad("hello")).toBe("Hello")
    })

    it("handles already capitalized first letter", () => {
      expect(camelPad("HelloWorld")).toBe("Hello World")
    })
  })

  describe("acronym handling", () => {
    it("separates acronyms followed by lowercase", () => {
      expect(camelPad("XMLParser")).toBe("XML Parser")
    })

    it("handles acronym at the end", () => {
      expect(camelPad("parseXML")).toBe("Parse XML")
    })

    it("handles multiple acronyms", () => {
      expect(camelPad("XMLToJSON")).toBe("XML To JSON")
    })

    it("handles acronym followed by camelCase", () => {
      expect(camelPad("HTMLElement")).toBe("HTML Element")
    })
  })

  describe("numbers handling", () => {
    it("separates numbers from letters", () => {
      expect(camelPad("item1")).toBe("Item 1")
    })

    it("handles numbers in the middle", () => {
      expect(camelPad("play14Event")).toBe("Play 14 Event")
    })

    it("handles multiple numbers", () => {
      // Note: function only capitalizes first letter, not each word
      expect(camelPad("room2floor3")).toBe("Room 2floor 3")
    })
  })

  describe("edge cases", () => {
    it("returns empty string for undefined", () => {
      expect(camelPad(undefined)).toBe("")
    })

    it("returns empty string for empty string", () => {
      expect(camelPad("")).toBe("")
    })

    it("handles single character", () => {
      expect(camelPad("a")).toBe("A")
    })

    it("handles all uppercase", () => {
      expect(camelPad("ABC")).toBe("ABC")
    })

    it("handles all lowercase", () => {
      expect(camelPad("abc")).toBe("Abc")
    })

    it("trims whitespace but does not capitalize after space", () => {
      // Note: trim happens but capitalization only applies to first char
      expect(camelPad(" helloWorld ")).toBe("hello World")
    })
  })

  describe("real-world examples", () => {
    it("handles event type names", () => {
      expect(camelPad("unconference")).toBe("Unconference")
      expect(camelPad("playShop")).toBe("Play Shop")
      expect(camelPad("gamingDay")).toBe("Gaming Day")
    })

    it("handles player role names", () => {
      expect(camelPad("eventHost")).toBe("Event Host")
      expect(camelPad("facilitator")).toBe("Facilitator")
    })

    it("handles technical terms", () => {
      expect(camelPad("apiEndpoint")).toBe("Api Endpoint")
      expect(camelPad("userId")).toBe("User Id")
    })
  })
})
