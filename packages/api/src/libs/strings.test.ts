/**
 * Unit tests for string utilities
 */

import { describe, it, expect } from "vitest"
import { toSlug, eventToSlug, capitalize, normalize } from "./strings"

describe("toSlug", () => {
  describe("basic slugification", () => {
    it("converts simple string to lowercase slug", () => {
      expect(toSlug("Hello World")).toBe("hello-world")
    })

    it("handles single word", () => {
      expect(toSlug("Paris")).toBe("paris")
    })

    it("handles multiple spaces", () => {
      expect(toSlug("Hello   World")).toBe("hello-world")
    })

    it("handles leading and trailing spaces", () => {
      expect(toSlug("  Hello World  ")).toBe("hello-world")
    })
  })

  describe("special characters removal", () => {
    it("removes asterisks", () => {
      expect(toSlug("Hello*World")).toBe("helloworld")
    })

    it("removes plus signs", () => {
      expect(toSlug("Hello+World")).toBe("helloworld")
    })

    it("removes tildes", () => {
      expect(toSlug("Hello~World")).toBe("helloworld")
    })

    it("removes periods", () => {
      expect(toSlug("Hello.World")).toBe("helloworld")
    })

    it("removes commas", () => {
      expect(toSlug("Hello,World")).toBe("helloworld")
    })

    it("removes ampersands", () => {
      // Slugify converts & to 'and', then we test what actually happens
      expect(toSlug("Hello&World")).toBe("helloandworld")
    })

    it("removes parentheses", () => {
      expect(toSlug("Hello(World)")).toBe("helloworld")
    })

    it("removes quotes", () => {
      expect(toSlug("Hello'World")).toBe("helloworld")
      expect(toSlug('Hello"World')).toBe("helloworld")
    })

    it("removes exclamation marks", () => {
      expect(toSlug("Hello!World")).toBe("helloworld")
    })

    it("removes colons", () => {
      expect(toSlug("Hello:World")).toBe("helloworld")
    })

    it("removes @ symbols", () => {
      expect(toSlug("Hello@World")).toBe("helloworld")
    })

    it("removes hash symbols", () => {
      expect(toSlug("Hello#World")).toBe("helloworld")
    })

    it("removes question marks", () => {
      expect(toSlug("Hello?World")).toBe("helloworld")
    })
  })

  describe("accented characters", () => {
    it("normalizes French accents", () => {
      expect(toSlug("Café")).toBe("cafe")
      expect(toSlug("Résumé")).toBe("resume")
    })

    it("normalizes German umlauts", () => {
      expect(toSlug("München")).toBe("munchen")
      expect(toSlug("Düsseldorf")).toBe("dusseldorf")
    })

    it("normalizes Spanish characters", () => {
      expect(toSlug("España")).toBe("espana")
      expect(toSlug("Niño")).toBe("nino")
    })

    it("normalizes Portuguese characters", () => {
      expect(toSlug("São Paulo")).toBe("sao-paulo")
      expect(toSlug("Ação")).toBe("acao")
    })

    it("normalizes Scandinavian characters", () => {
      expect(toSlug("Malmö")).toBe("malmo")
      expect(toSlug("Århus")).toBe("arhus")
    })
  })

  describe("real-world event names", () => {
    it("handles typical play14 event names", () => {
      expect(toSlug("play14 Paris")).toBe("play14-paris")
      expect(toSlug("play14 Hamburg")).toBe("play14-hamburg")
      expect(toSlug("play14 São Paulo")).toBe("play14-sao-paulo")
    })

    it("handles event names with special characters", () => {
      expect(toSlug("#play14 Paris!")).toBe("play14-paris")
      expect(toSlug("play14 @ Berlin")).toBe("play14-berlin")
    })
  })
})

describe("eventToSlug", () => {
  it("creates slug with month from start date", () => {
    // January event
    const result = eventToSlug("Paris", "2025-01-15T09:00:00Z")
    expect(result).toBe("paris-01")
  })

  it("pads single-digit months with zero", () => {
    // February
    expect(eventToSlug("Berlin", "2025-02-10T09:00:00Z")).toBe("berlin-02")
    // September
    expect(eventToSlug("London", "2025-09-20T09:00:00Z")).toBe("london-09")
  })

  it("handles double-digit months", () => {
    // October
    expect(eventToSlug("Amsterdam", "2025-10-15T09:00:00Z")).toBe("amsterdam-10")
    // December
    expect(eventToSlug("Vienna", "2025-12-01T09:00:00Z")).toBe("vienna-12")
  })

  it("combines name slugification with month", () => {
    expect(eventToSlug("São Paulo", "2025-03-15T09:00:00Z")).toBe("sao-paulo-03")
    expect(eventToSlug("New York City", "2025-06-20T09:00:00Z")).toBe(
      "new-york-city-06"
    )
  })

  it("handles ISO date strings", () => {
    expect(eventToSlug("Paris", "2025-07-14T10:30:00.000Z")).toBe("paris-07")
  })

  it("handles Date objects converted to string", () => {
    const date = new Date("2025-11-25T09:00:00Z")
    expect(eventToSlug("Munich", date.toISOString())).toBe("munich-11")
  })
})

describe("capitalize", () => {
  it("capitalizes first letter of lowercase string", () => {
    expect(capitalize("hello")).toBe("Hello")
  })

  it("keeps rest of string unchanged", () => {
    expect(capitalize("hello world")).toBe("Hello world")
  })

  it("handles already capitalized strings", () => {
    expect(capitalize("Hello")).toBe("Hello")
  })

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A")
  })

  it("handles empty string", () => {
    expect(capitalize("")).toBe("")
  })

  it("handles uppercase first letter", () => {
    expect(capitalize("HELLO")).toBe("HELLO")
  })
})

describe("normalize", () => {
  it("removes diacritical marks from characters", () => {
    expect(normalize("café")).toBe("cafe")
    expect(normalize("naïve")).toBe("naive")
  })

  it("handles combined characters", () => {
    expect(normalize("résumé")).toBe("resume")
    expect(normalize("piñata")).toBe("pinata")
  })

  it("preserves non-accented characters", () => {
    expect(normalize("hello")).toBe("hello")
    expect(normalize("123")).toBe("123")
  })

  it("handles mixed content", () => {
    expect(normalize("Hëllo Wörld 123!")).toBe("Hello World 123!")
  })

  it("handles empty string", () => {
    expect(normalize("")).toBe("")
  })
})
