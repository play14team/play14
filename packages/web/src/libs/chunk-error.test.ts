import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isChunkLoadError, recoverFromChunkError } from "./chunk-error"

describe("isChunkLoadError", () => {
  it("matches by error name", () => {
    const e = new Error("boom")
    e.name = "ChunkLoadError"
    expect(isChunkLoadError(e)).toBe(true)
  })

  it("matches by message", () => {
    expect(isChunkLoadError(new Error("Failed to load chunk /_next/static/chunks/abc.js"))).toBe(
      true
    )
    expect(isChunkLoadError(new Error("Loading chunk 123 failed"))).toBe(true)
    expect(isChunkLoadError(new Error("Loading CSS chunk 5 failed"))).toBe(true)
  })

  it("ignores unrelated and nullish errors", () => {
    expect(isChunkLoadError(new Error("network down"))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe("recoverFromChunkError", () => {
  const reload = vi.fn()
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    reload.mockClear()
    ;(globalThis as { window?: unknown }).window = {
      location: { reload },
      sessionStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v
        },
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { window?: unknown }).window
  })

  const chunkError = () => {
    const e = new Error("Failed to load chunk x")
    e.name = "ChunkLoadError"
    return e
  }

  it("reloads once on a chunk error and guards rapid repeats", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    // A second chunk error within the guard window must NOT reload (no loop).
    expect(recoverFromChunkError(chunkError())).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("reloads again once the guard window elapses", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    vi.advanceTimersByTime(11_000)
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it("does nothing for a non-chunk error", () => {
    expect(recoverFromChunkError(new Error("nope"))).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
