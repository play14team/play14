/**
 * Rate limit middleware tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import rateLimitMiddleware from "./rate-limit"

describe("Rate Limit Middleware", () => {
  const mockStrapi = {
    log: {
      warn: vi.fn(),
    },
  } as any

  const createMockContext = (path = "/api/test", ip = "127.0.0.1") => ({
    request: {
      path,
      ip,
      headers: {},
    },
    ip,
    status: 200,
    body: null,
    set: vi.fn(),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should allow requests under the limit", async () => {
    const middleware = rateLimitMiddleware(
      { max: 5, windowMs: 60000, onlyPaths: ["^/api/test$"] },
      { strapi: mockStrapi }
    )

    const ctx = createMockContext()
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.status).toBe(200)
    expect(ctx.set).toHaveBeenCalledWith("X-RateLimit-Limit", "5")
    expect(ctx.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "4")
  })

  it("should skip paths not in onlyPaths", async () => {
    const middleware = rateLimitMiddleware(
      { max: 1, windowMs: 60000, onlyPaths: ["^/api/protected$"] },
      { strapi: mockStrapi }
    )

    const ctx = createMockContext("/api/other")
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.set).not.toHaveBeenCalled()
  })

  it("should block requests over the limit", async () => {
    const middleware = rateLimitMiddleware(
      { max: 2, windowMs: 60000, onlyPaths: ["^/api/limited$"] },
      { strapi: mockStrapi }
    )

    const ctx1 = createMockContext("/api/limited", "192.168.1.1")
    const ctx2 = createMockContext("/api/limited", "192.168.1.1")
    const ctx3 = createMockContext("/api/limited", "192.168.1.1")
    const next = vi.fn()

    await middleware(ctx1, next)
    await middleware(ctx2, next)
    await middleware(ctx3, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(ctx3.status).toBe(429)
    expect(ctx3.body).toEqual({
      error: {
        status: 429,
        name: "TooManyRequestsError",
        message: "Too many requests, please try again later.",
      },
    })
    expect(mockStrapi.log.warn).toHaveBeenCalled()
  })

  it("should use X-Forwarded-For header when present", async () => {
    const middleware = rateLimitMiddleware(
      { max: 1, windowMs: 60000, onlyPaths: ["^/api/test$"] },
      { strapi: mockStrapi }
    )

    const ctx = {
      ...createMockContext("/api/test", "127.0.0.1"),
      request: {
        path: "/api/test",
        ip: "127.0.0.1",
        headers: { "x-forwarded-for": "10.0.0.1, 192.168.1.1" },
      },
    }
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
  })

  it("should set Retry-After header when rate limited", async () => {
    const middleware = rateLimitMiddleware(
      { max: 1, windowMs: 60000, onlyPaths: ["^/api/limited2$"] },
      { strapi: mockStrapi }
    )

    const ctx1 = createMockContext("/api/limited2", "10.0.0.5")
    const ctx2 = createMockContext("/api/limited2", "10.0.0.5")
    const next = vi.fn()

    await middleware(ctx1, next)
    await middleware(ctx2, next)

    expect(ctx2.set).toHaveBeenCalledWith("Retry-After", expect.stringMatching(/^\d+$/))
  })
})
