import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isChunkLoadError, recoverFromChunkError, willRecoverFromChunkError } from "./chunk-error"

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

const chunkError = () => {
  const e = new Error("Failed to load chunk x")
  e.name = "ChunkLoadError"
  return e
}

describe("recoverFromChunkError", () => {
  const reload = vi.fn()
  let store: Record<string, string>
  let throwOnStorage: boolean

  beforeEach(() => {
    store = {}
    throwOnStorage = false
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    reload.mockClear()
    ;(globalThis as { window?: unknown }).window = {
      location: { reload },
      sessionStorage: {
        getItem: (k: string) => {
          if (throwOnStorage) throw new Error("SecurityError")
          return k in store ? store[k] : null
        },
        setItem: (k: string, v: string) => {
          if (throwOnStorage) throw new Error("SecurityError")
          store[k] = v
        },
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { window?: unknown }).window
  })

  // Simulate the browser actually reloading: a fresh window loses the in-memory flag,
  // but same-origin sessionStorage persists.
  const simulateReload = () => {
    delete (globalThis.window as { __play14ChunkReloaded?: boolean }).__play14ChunkReloaded
  }

  it("reloads once on a chunk error and guards rapid repeats", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    // A second chunk error within the same page load must NOT reload (no loop).
    expect(recoverFromChunkError(chunkError())).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("reloads again once the guard window elapses on a fresh page load", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    simulateReload()
    vi.advanceTimersByTime(11_000)
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it("still reloads but cannot loop when sessionStorage is inaccessible", () => {
    throwOnStorage = true
    // First chunk error: storage read throws → in-memory backstop lets it reload once.
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    // Same page load: the in-memory flag prevents a second reload despite broken storage.
    expect(recoverFromChunkError(chunkError())).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("does nothing for a non-chunk error", () => {
    expect(recoverFromChunkError(new Error("nope"))).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})

describe("willRecoverFromChunkError", () => {
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

  it("is true for a fresh chunk error and false once a reload is in flight", () => {
    expect(willRecoverFromChunkError(chunkError())).toBe(true)
    recoverFromChunkError(chunkError())
    // Guard is now active → the boundary must NOT show the reloading spinner again.
    expect(willRecoverFromChunkError(chunkError())).toBe(false)
  })

  it("is false for a non-chunk error", () => {
    expect(willRecoverFromChunkError(new Error("nope"))).toBe(false)
  })
})
