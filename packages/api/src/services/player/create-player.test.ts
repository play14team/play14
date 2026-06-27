import type { Core } from "@strapi/strapi"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createUnlinkedPlayer } from "./create-player"

const createMockStrapi = () => {
  const model = {
    findMany: vi.fn(),
    create: vi.fn(),
  }
  const strapi = {
    documents: vi.fn(() => model),
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi
  return { strapi, model }
}

describe("createUnlinkedPlayer", () => {
  let strapi: Core.Strapi
  let model: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    const m = createMockStrapi()
    strapi = m.strapi
    model = m.model
    model.findMany.mockResolvedValue([]) // no name clash by default
  })

  it("returns name-exists and never creates when an exact name already exists", async () => {
    model.findMany.mockResolvedValue([{ documentId: "ply-existing" }])

    const result = await createUnlinkedPlayer(strapi, { name: "Jane Doe" })

    expect(result).toEqual({ status: "name-exists" })
    expect(model.create).not.toHaveBeenCalled()
  })

  it("creates with slug=toSlug(name), trimmed company, and position Player", async () => {
    model.create.mockResolvedValue({ documentId: "ply-1", name: "Jane Doe", slug: "jane-doe" })

    const result = await createUnlinkedPlayer(strapi, { name: "Jane Doe", company: "  ACME  " })

    expect(model.create).toHaveBeenCalledWith({
      data: { name: "Jane Doe", slug: "jane-doe", company: "ACME", position: "Player" },
    })
    expect(result).toEqual({
      status: "created",
      player: { documentId: "ply-1", name: "Jane Doe", slug: "jane-doe" },
    })
  })

  it("coerces blank/non-string company to null", async () => {
    model.create.mockResolvedValue({ documentId: "ply-2" })

    await createUnlinkedPlayer(strapi, { name: "No Co", company: "   " })
    await createUnlinkedPlayer(strapi, { name: "No Co 2", company: 42 })

    expect(model.create.mock.calls[0][0].data.company).toBeNull()
    expect(model.create.mock.calls[1][0].data.company).toBeNull()
  })

  it("maps a unique-constraint violation to slug-conflict (not a throw)", async () => {
    model.create.mockRejectedValue(new Error("duplicate key value violates unique constraint"))

    const result = await createUnlinkedPlayer(strapi, { name: "Rémi" })

    expect(result).toEqual({ status: "slug-conflict" })
  })

  it("rethrows a non-uniqueness error for the caller to handle", async () => {
    model.create.mockRejectedValue(new Error("connection refused"))

    await expect(createUnlinkedPlayer(strapi, { name: "Boom" })).rejects.toThrow(
      "connection refused"
    )
  })
})
