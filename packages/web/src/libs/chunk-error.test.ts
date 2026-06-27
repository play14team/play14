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

const BASE_URL = "https://staging.play14.org/admin/players/abc"

describe("recoverFromChunkError", () => {
  const replace = vi.fn()
  const reload = vi.fn()
  let href: string

  beforeEach(() => {
    href = BASE_URL
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    replace.mockReset().mockImplementation((u: string) => {
      href = u // simulate the navigation updating the address bar
    })
    reload.mockReset()
    ;(globalThis as { window?: unknown }).window = {
      location: {
        get href() {
          return href
        },
        get search() {
          return new URL(href).search
        },
        replace,
        reload,
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { window?: unknown }).window
  })

  // A real reload starts a fresh window (in-memory flag gone) but keeps the URL — model that.
  const simulateReload = () => {
    delete (globalThis.window as { __play14ChunkReloaded?: boolean }).__play14ChunkReloaded
  }

  it("reloads once on a chunk error and guards same-page repeats", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(replace).toHaveBeenCalledTimes(1)
    expect(href).toContain("_chunkReload=")
    // A second chunk error within the same page load must NOT reload (no loop).
    expect(recoverFromChunkError(chunkError())).toBe(false)
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it("breaks the loop after one reload even with no storage (URL marker survives)", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    // Fresh page load after the reload: in-memory flag is gone, but the URL marker remains.
    simulateReload()
    // The chunk is still missing (broken deploy) — recovery must give up, not loop.
    expect(recoverFromChunkError(chunkError())).toBe(false)
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it("allows recovery again once the marker goes stale", () => {
    expect(recoverFromChunkError(chunkError())).toBe(true)
    simulateReload()
    vi.advanceTimersByTime(11_000)
    expect(recoverFromChunkError(chunkError())).toBe(true)
    expect(replace).toHaveBeenCalledTimes(2)
  })

  it("does nothing for a non-chunk error", () => {
    expect(recoverFromChunkError(new Error("nope"))).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })
})

describe("willRecoverFromChunkError", () => {
  const replace = vi.fn()
  let href: string

  beforeEach(() => {
    href = BASE_URL
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
    replace.mockReset().mockImplementation((u: string) => {
      href = u
    })
    ;(globalThis as { window?: unknown }).window = {
      location: {
        get href() {
          return href
        },
        get search() {
          return new URL(href).search
        },
        replace,
        reload: vi.fn(),
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
