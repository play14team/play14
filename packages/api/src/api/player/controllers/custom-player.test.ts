import type { Core } from "@strapi/strapi"
import { beforeEach, describe, expect, it, vi } from "vitest"
import customPlayerFactory from "./custom-player"

// The controller module pulls in email rendering + side services at import time; stub the
// heavy ones so this unit test stays focused on createPlayer's own logic.
vi.mock("@react-email/render", () => ({ render: vi.fn(async () => "<html></html>") }))
vi.mock("../../../emails/user-invitation", () => ({ default: () => null }))
vi.mock("../../../services/email-send", () => ({ sendEmail: vi.fn() }))
vi.mock("../../../services/sender-subscribers", () => ({ addSubscriberToGroup: vi.fn() }))
vi.mock("../../../services/user-role-sync", () => ({ syncUserRoleFromPlayer: vi.fn() }))
vi.mock("../../../services/users-permissions/find-user-by-email", () => ({
  findUserByEmail: vi.fn(),
}))

const createMockStrapi = () => {
  const models: Record<string, ReturnType<typeof makeModel>> = {}
  const makeModel = () => ({
    findOne: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })
  const model = (uid: string) => {
    if (!models[uid]) models[uid] = makeModel()
    return models[uid]
  }
  const strapi = {
    documents: vi.fn((uid: string) => model(uid)),
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  } as unknown as Core.Strapi
  return { strapi, model }
}

const createMockContext = (overrides: Partial<any> = {}) => ({
  state: { user: null },
  params: {},
  query: {},
  request: { body: {} },
  send: vi.fn(),
  unauthorized: vi.fn(),
  forbidden: vi.fn(),
  badRequest: vi.fn(),
  notFound: vi.fn(),
  internalServerError: vi.fn(),
  ...overrides,
})

const USER_UID = "plugin::users-permissions.user"
const PLAYER_UID = "api::player.player"

describe("custom-player.createPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Wire an organizer (Founder) user by default. */
  const setupOrganizer = () => {
    const mocks = createMockStrapi()
    mocks.model(USER_UID).findFirst.mockResolvedValue({
      id: 1,
      player: { documentId: "host-1", name: "Host One", position: "Founder" },
    })
    return mocks
  }

  it("returns unauthorized when not logged in", async () => {
    const { strapi } = createMockStrapi()
    const ctx = createMockContext()
    await customPlayerFactory({ strapi }).createPlayer(ctx)
    expect(ctx.unauthorized).toHaveBeenCalled()
  })

  it("returns forbidden when the caller is only a Player (not an organizer)", async () => {
    const { strapi, model } = createMockStrapi()
    model(USER_UID).findFirst.mockResolvedValue({
      id: 2,
      player: { documentId: "player-x", name: "Reg", position: "Player" },
    })
    const ctx = createMockContext({
      state: { user: { id: 2 } },
      request: { body: { data: { name: "New Person" } } },
    })
    await customPlayerFactory({ strapi }).createPlayer(ctx)
    expect(ctx.forbidden).toHaveBeenCalled()
    expect(model(PLAYER_UID).create).not.toHaveBeenCalled()
  })

  it("rejects a name shorter than 2 characters", async () => {
    const { strapi, model } = setupOrganizer()
    const ctx = createMockContext({
      state: { user: { id: 1 } },
      request: { body: { data: { name: "A" } } },
    })
    await customPlayerFactory({ strapi }).createPlayer(ctx)
    expect(ctx.badRequest).toHaveBeenCalledWith(
      "Name is required and must be at least 2 characters"
    )
    expect(model(PLAYER_UID).create).not.toHaveBeenCalled()
  })

  it("rejects a name that already exists", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([{ documentId: "ply-existing" }])
    const ctx = createMockContext({
      state: { user: { id: 1 } },
      request: { body: { data: { name: "Existing Name" } } },
    })
    await customPlayerFactory({ strapi }).createPlayer(ctx)
    expect(ctx.badRequest).toHaveBeenCalledWith(
      "A player with this name already exists. Select the existing player instead."
    )
    expect(model(PLAYER_UID).create).not.toHaveBeenCalled()
  })

  it("creates an unlinked player with a slug set (slug is required before the lifecycle runs)", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([]) // no name clash
    model(PLAYER_UID).create.mockResolvedValue({
      documentId: "ply-new",
      slug: "new-person",
      name: "New Person",
      position: "Player",
      company: "ACME",
    })
    const ctx = createMockContext({
      state: { user: { id: 1 } },
      request: { body: { data: { name: "  New Person  ", company: " ACME " } } },
    })

    await customPlayerFactory({ strapi }).createPlayer(ctx)

    expect(model(PLAYER_UID).create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "New Person",
        slug: "new-person",
        company: "ACME",
        position: "Player",
      }),
    })
    expect(ctx.send).toHaveBeenCalledWith({
      data: {
        documentId: "ply-new",
        slug: "new-person",
        name: "New Person",
        position: "Player",
        company: "ACME",
      },
    })
  })

  it("returns a clear clash message (not a 500) when create hits the unique constraint", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([])
    model(PLAYER_UID).create.mockRejectedValue(new Error("duplicate key value violates unique"))
    const ctx = createMockContext({
      state: { user: { id: 1 } },
      request: { body: { data: { name: "Rémi" } } },
    })

    await customPlayerFactory({ strapi }).createPlayer(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      "A player with this name (or a very similar one) already exists. Select the existing player instead."
    )
    expect(ctx.internalServerError).not.toHaveBeenCalled()
  })
})
