import { describe, expect, it, vi } from "vitest"
import { findUserByEmail } from "./find-user-by-email"

function makeStrapi(findFirst: ReturnType<typeof vi.fn>) {
  return {
    documents: vi.fn(() => ({ findFirst })),
  } as any
}

describe("findUserByEmail", () => {
  it("queries with a case-insensitive `$eqi` filter on email", async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const strapi = makeStrapi(findFirst)

    await findUserByEmail(strapi, "GRANT.bosnick@gmail.com")

    expect(strapi.documents).toHaveBeenCalledWith("plugin::users-permissions.user")
    expect(findFirst).toHaveBeenCalledWith({
      filters: { email: { $eqi: "GRANT.bosnick@gmail.com" } },
    })
  })

  it("trims surrounding whitespace before querying", async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const strapi = makeStrapi(findFirst)

    await findUserByEmail(strapi, "  user@example.com  ")

    expect(findFirst).toHaveBeenCalledWith({
      filters: { email: { $eqi: "user@example.com" } },
    })
  })

  it("returns null for empty / whitespace-only emails without querying", async () => {
    const findFirst = vi.fn()
    const strapi = makeStrapi(findFirst)

    await expect(findUserByEmail(strapi, "")).resolves.toBeNull()
    await expect(findUserByEmail(strapi, "   ")).resolves.toBeNull()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it("passes through populate when provided", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 1, documentId: "abc" })
    const strapi = makeStrapi(findFirst)

    await findUserByEmail(strapi, "user@example.com", { player: true })

    expect(findFirst).toHaveBeenCalledWith({
      filters: { email: { $eqi: "user@example.com" } },
      populate: { player: true },
    })
  })

  it("returns the matched user when one exists", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 42, documentId: "abc" })
    const strapi = makeStrapi(findFirst)

    const result = await findUserByEmail(strapi, "user@example.com")

    expect(result).toEqual({ id: 42, documentId: "abc" })
  })

  it("re-throws transient DB errors instead of swallowing them", async () => {
    // The helper deliberately does NOT swallow rejections — callers need to
    // distinguish "no row" (null) from "lookup failed" (throw). Future
    // contributors must NOT add a try/catch here without a load-bearing reason.
    const findFirst = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    const strapi = makeStrapi(findFirst)

    await expect(findUserByEmail(strapi, "user@example.com")).rejects.toThrow("ECONNREFUSED")
  })
})
