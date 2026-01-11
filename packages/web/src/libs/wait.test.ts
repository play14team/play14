/**
 * Unit tests for wait utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { wait } from "./wait"

describe("wait", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("timing behavior", () => {
    it("resolves after specified milliseconds", async () => {
      const waitPromise = wait(1000)

      // Should not resolve immediately
      vi.advanceTimersByTime(500)
      let resolved = false
      waitPromise.then(() => {
        resolved = true
      })
      await vi.advanceTimersByTimeAsync(0)
      expect(resolved).toBe(false)

      // Should resolve after full time
      vi.advanceTimersByTime(500)
      await vi.advanceTimersByTimeAsync(0)
      expect(resolved).toBe(true)
    })

    it("waits for zero milliseconds", async () => {
      const start = Date.now()
      const waitPromise = wait(0)

      await vi.advanceTimersByTimeAsync(0)
      await waitPromise

      // Should resolve almost immediately
      expect(Date.now() - start).toBeLessThan(10)
    })

    it("waits for longer durations", async () => {
      const waitPromise = wait(5000)

      let resolved = false
      waitPromise.then(() => {
        resolved = true
      })

      vi.advanceTimersByTime(4999)
      await vi.advanceTimersByTimeAsync(0)
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await vi.advanceTimersByTimeAsync(0)
      expect(resolved).toBe(true)
    })
  })

  describe("console output", () => {
    it("logs start message", async () => {
      const waitPromise = wait(100)

      expect(console.log).toHaveBeenCalledWith("Simulate wait")

      await vi.advanceTimersByTimeAsync(100)
      await waitPromise
    })

    it("logs end message after wait completes", async () => {
      const waitPromise = wait(100)

      // End message should not be logged yet
      expect(console.log).not.toHaveBeenCalledWith("Wait is over now")

      await vi.advanceTimersByTimeAsync(100)
      await waitPromise

      expect(console.log).toHaveBeenCalledWith("Wait is over now")
    })
  })

  describe("promise behavior", () => {
    it("returns a promise", () => {
      const result = wait(100)

      expect(result).toBeInstanceOf(Promise)

      // Clean up
      vi.advanceTimersByTime(100)
    })

    it("resolves to undefined", async () => {
      const waitPromise = wait(100)

      await vi.advanceTimersByTimeAsync(100)
      const result = await waitPromise

      expect(result).toBeUndefined()
    })
  })
})
