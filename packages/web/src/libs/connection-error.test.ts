import { describe, expect, it } from "vitest"
import { isConnectionError } from "./connection-error"

describe("isConnectionError", () => {
  it("matches transient network failures by message", () => {
    expect(isConnectionError(new Error("fetch failed"))).toBe(true)
    expect(isConnectionError(new Error("connect ECONNREFUSED 127.0.0.1:1337"))).toBe(true)
    expect(isConnectionError(new Error("ECONNABORTED"))).toBe(true)
  })

  it("matches ECONNRESET via the error cause", () => {
    const e = Object.assign(new Error("request failed"), { cause: { code: "ECONNRESET" } })
    expect(isConnectionError(e)).toBe(true)
  })

  it("ignores application errors and nullish input", () => {
    expect(isConnectionError(new Error("Validation error: Invalid status"))).toBe(false)
    expect(isConnectionError(null)).toBe(false)
    expect(isConnectionError(undefined)).toBe(false)
  })
})
