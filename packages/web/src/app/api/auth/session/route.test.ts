import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

const { setAuthCookie } = vi.hoisted(() => ({ setAuthCookie: vi.fn() }))
vi.mock("@/libs/auth", () => ({ setAuthCookie }))

function post(body: unknown, origin: string | null = "https://play14.org") {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (origin) headers.origin = origin
  return new NextRequest("https://play14.org/api/auth/session", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/session", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    setAuthCookie.mockReset()
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects a cross-origin request", async () => {
    const res = await POST(post({ jwt: "abc" }, "https://evil.example"))
    expect(res.status).toBe(403)
    expect(setAuthCookie).not.toHaveBeenCalled()
  })

  it("rejects a request without an Origin header", async () => {
    const res = await POST(post({ jwt: "abc" }, null))
    expect(res.status).toBe(403)
  })

  it("rejects a missing JWT", async () => {
    const res = await POST(post({}))
    expect(res.status).toBe(400)
  })

  it("rejects a JWT Strapi does not accept", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }))
    const res = await POST(post({ jwt: "forged" }))
    expect(res.status).toBe(401)
    expect(setAuthCookie).not.toHaveBeenCalled()
  })

  it("stores a valid JWT in the auth cookie", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
    const res = await POST(post({ jwt: "good" }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/me"),
      expect.objectContaining({ headers: { Authorization: "Bearer good" } })
    )
    expect(setAuthCookie).toHaveBeenCalledWith("good")
  })
})
