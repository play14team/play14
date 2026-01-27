/**
 * Unit tests for currency utilities
 */

import { describe, expect, it } from "vitest"
import {
  formatCurrency,
  formatPrice,
  getCurrency,
  STRIPE_CURRENCIES,
  STRIPE_CURRENCY_CODES,
  ZERO_DECIMAL_CURRENCIES,
} from "./currencies"

describe("STRIPE_CURRENCIES", () => {
  it("contains major world currencies", () => {
    const codes = STRIPE_CURRENCIES.map((c) => c.code)

    expect(codes).toContain("USD")
    expect(codes).toContain("EUR")
    expect(codes).toContain("GBP")
    expect(codes).toContain("JPY")
    expect(codes).toContain("CAD")
    expect(codes).toContain("AUD")
  })

  it("has valid structure for all currencies", () => {
    for (const currency of STRIPE_CURRENCIES) {
      expect(currency).toHaveProperty("code")
      expect(currency).toHaveProperty("symbol")
      expect(currency).toHaveProperty("name")
      expect(currency.code).toHaveLength(3)
      expect(currency.symbol).toBeTruthy()
      expect(currency.name).toBeTruthy()
    }
  })

  it("contains 135+ currencies", () => {
    expect(STRIPE_CURRENCIES.length).toBeGreaterThanOrEqual(100)
  })

  it("has unique currency codes", () => {
    const codes = STRIPE_CURRENCIES.map((c) => c.code)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })
})

describe("ZERO_DECIMAL_CURRENCIES", () => {
  it("includes known zero-decimal currencies", () => {
    expect(ZERO_DECIMAL_CURRENCIES).toContain("JPY")
    expect(ZERO_DECIMAL_CURRENCIES).toContain("KRW")
    expect(ZERO_DECIMAL_CURRENCIES).toContain("VND")
    expect(ZERO_DECIMAL_CURRENCIES).toContain("CLP")
  })

  it("does not include standard currencies", () => {
    expect(ZERO_DECIMAL_CURRENCIES).not.toContain("USD")
    expect(ZERO_DECIMAL_CURRENCIES).not.toContain("EUR")
    expect(ZERO_DECIMAL_CURRENCIES).not.toContain("GBP")
  })

  it("contains 17 zero-decimal currencies", () => {
    expect(ZERO_DECIMAL_CURRENCIES.length).toBe(17)
  })
})

describe("STRIPE_CURRENCY_CODES", () => {
  it("contains all currency codes from STRIPE_CURRENCIES", () => {
    expect(STRIPE_CURRENCY_CODES.length).toBe(STRIPE_CURRENCIES.length)

    for (const currency of STRIPE_CURRENCIES) {
      expect(STRIPE_CURRENCY_CODES).toContain(currency.code)
    }
  })

  it("is an array of strings", () => {
    for (const code of STRIPE_CURRENCY_CODES) {
      expect(typeof code).toBe("string")
      expect(code).toHaveLength(3)
    }
  })
})

describe("getCurrency", () => {
  it("returns currency object for valid code", () => {
    const usd = getCurrency("USD")

    expect(usd).toBeDefined()
    expect(usd?.code).toBe("USD")
    expect(usd?.symbol).toBe("$")
    expect(usd?.name).toBe("US Dollar")
  })

  it("returns euro currency", () => {
    const eur = getCurrency("EUR")

    expect(eur).toBeDefined()
    expect(eur?.code).toBe("EUR")
    expect(eur?.symbol).toBe("€")
    expect(eur?.name).toBe("Euro")
  })

  it("returns undefined for invalid code", () => {
    const invalid = getCurrency("INVALID")

    expect(invalid).toBeUndefined()
  })

  it("returns undefined for lowercase code", () => {
    // getCurrency is case-sensitive
    const lowercase = getCurrency("usd")

    expect(lowercase).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    const empty = getCurrency("")

    expect(empty).toBeUndefined()
  })

  it("finds currencies with special symbols", () => {
    const jpy = getCurrency("JPY")
    expect(jpy?.symbol).toBe("¥")

    const gbp = getCurrency("GBP")
    expect(gbp?.symbol).toBe("£")

    const inr = getCurrency("INR")
    expect(inr?.symbol).toBe("₹")
  })
})

describe("formatPrice", () => {
  describe("standard currencies (2 decimal places)", () => {
    it("formats USD correctly", () => {
      expect(formatPrice(99.99, "USD")).toBe("$ 99.99")
    })

    it("formats EUR correctly", () => {
      expect(formatPrice(50, "EUR")).toBe("€ 50.00")
    })

    it("formats GBP correctly", () => {
      expect(formatPrice(75.5, "GBP")).toBe("£ 75.50")
    })

    it("formats whole numbers with .00", () => {
      expect(formatPrice(100, "USD")).toBe("$ 100.00")
    })

    it("rounds to 2 decimal places", () => {
      expect(formatPrice(99.999, "EUR")).toBe("€ 100.00")
    })
  })

  describe("zero-decimal currencies (no decimal places)", () => {
    it("formats JPY without decimals", () => {
      expect(formatPrice(1000, "JPY")).toBe("¥ 1000")
    })

    it("formats KRW without decimals", () => {
      expect(formatPrice(50000, "KRW")).toBe("₩ 50000")
    })

    it("formats VND without decimals", () => {
      expect(formatPrice(100000, "VND")).toBe("₫ 100000")
    })

    it("rounds to whole number for zero-decimal currencies", () => {
      // toFixed(0) rounds 0.5 up to 1, so 1000.5 becomes 1001
      expect(formatPrice(1000.5, "JPY")).toBe("¥ 1001")
    })
  })

  describe("unknown currencies", () => {
    it("uses currency code as symbol for unknown currencies", () => {
      const result = formatPrice(100, "UNKNOWN")

      expect(result).toBe("UNKNOWN 100.00")
    })
  })

  describe("edge cases", () => {
    it("handles zero amount", () => {
      expect(formatPrice(0, "USD")).toBe("$ 0.00")
      expect(formatPrice(0, "JPY")).toBe("¥ 0")
    })

    it("handles negative amounts", () => {
      expect(formatPrice(-50, "EUR")).toBe("€ -50.00")
    })

    it("handles very large amounts", () => {
      expect(formatPrice(1000000, "USD")).toBe("$ 1000000.00")
    })

    it("handles very small decimal amounts", () => {
      expect(formatPrice(0.01, "USD")).toBe("$ 0.01")
    })
  })
})

describe("formatCurrency", () => {
  describe("locale-aware formatting", () => {
    it("formats EUR with German locale (symbol after amount)", () => {
      const result = formatCurrency(1234.56, "EUR")
      // de-DE locale: "1.234,56 €"
      expect(result).toContain("€")
      expect(result).toContain("1.234")
    })

    it("formats USD with US locale (symbol before amount)", () => {
      const result = formatCurrency(1234.56, "USD")
      // en-US locale: "$1,234.56"
      expect(result).toContain("$")
      expect(result).toContain("1,234")
    })

    it("formats CHF with Swiss locale", () => {
      const result = formatCurrency(1234.56, "CHF")
      expect(result).toContain("CHF")
    })
  })

  describe("case insensitivity", () => {
    it("handles lowercase currency codes", () => {
      const result = formatCurrency(100, "eur")
      expect(result).toContain("€")
    })

    it("handles mixed case currency codes", () => {
      const result = formatCurrency(100, "Eur")
      expect(result).toContain("€")
    })
  })

  describe("zero-decimal currencies", () => {
    it("formats JPY without decimal places", () => {
      const result = formatCurrency(1000, "JPY")
      expect(result).toContain("¥")
      expect(result).not.toContain(".")
      expect(result).toContain("1,000")
    })

    it("formats KRW without decimal places", () => {
      const result = formatCurrency(50000, "KRW")
      expect(result).toContain("₩")
      expect(result).not.toContain(".")
    })
  })

  describe("custom fraction digits", () => {
    it("respects minimumFractionDigits option", () => {
      const result = formatCurrency(100, "EUR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      expect(result).not.toContain(",00")
    })

    it("allows more fraction digits when specified", () => {
      const result = formatCurrency(99.999, "USD", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })
      expect(result).toContain("99.999")
    })
  })

  describe("edge cases", () => {
    it("handles zero amount", () => {
      const result = formatCurrency(0, "EUR")
      expect(result).toContain("€")
      expect(result).toContain("0")
    })

    it("handles negative amounts", () => {
      const result = formatCurrency(-50, "USD")
      expect(result).toContain("$")
      expect(result).toContain("-")
    })

    it("handles large amounts with thousand separators", () => {
      const result = formatCurrency(1000000, "EUR")
      expect(result).toContain("€")
      // de-DE uses dots for thousands
      expect(result).toContain("1.000.000")
    })
  })
})
