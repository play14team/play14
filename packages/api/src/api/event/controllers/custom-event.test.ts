import type { Core } from "@strapi/strapi"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { acquireLock } from "../../../services/cron/distributed-lock"
import { addPlayerToEventAttendees } from "../../../services/ticketing/player-service"
import customEventFactory from "./custom-event"

vi.mock("../../../libs/tickets", () => ({
  generateTicketCode: vi.fn(() => "TKT-TEST-1234"),
  generateOrderNumber: vi.fn(() => "P14-TEST-0001"),
}))
vi.mock("../../../services/ticketing/player-service", () => ({
  addPlayerToEventAttendees: vi.fn(),
}))
vi.mock("../../../services/cron/distributed-lock", () => ({
  acquireLock: vi.fn(async () => "test-lock-token"),
  releaseLock: vi.fn(async () => {}),
}))

/**
 * Mock Strapi whose `documents(uid)` returns a stable per-model mock, so the
 * multi-model `addParticipant` flow can be driven model-by-model.
 */
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
const EVENT_UID = "api::event.event"
const PLAYER_UID = "api::player.player"
const TICKET_UID = "api::ticket.ticket"
const TICKET_TYPE_UID = "api::ticket-type.ticket-type"

const EVENT = { id: 10, documentId: "evt-1", name: "Test Event", hosts: [], mentors: [] }

describe("custom-event.addParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Wire an organizer (Founder) user + a found event by default. */
  const setupOrganizer = () => {
    const mocks = createMockStrapi()
    const { model } = mocks
    model(USER_UID).findFirst.mockResolvedValue({
      id: 1,
      player: { documentId: "host-1", name: "Host One", position: "Founder" },
    })
    model(EVENT_UID).findOne.mockResolvedValue({ ...EVENT })
    return mocks
  }

  it("returns unauthorized when not logged in", async () => {
    const { strapi } = createMockStrapi()
    const ctx = createMockContext({ params: { eventId: "evt-1" } })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.unauthorized).toHaveBeenCalledWith("You must be logged in")
  })

  it("returns forbidden when the user has no linked player", async () => {
    const { strapi, model } = createMockStrapi()
    model(USER_UID).findFirst.mockResolvedValue({ id: 1, player: null })
    const ctx = createMockContext({ state: { user: { id: 1 } }, params: { eventId: "evt-1" } })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.forbidden).toHaveBeenCalledWith("You must have a linked player profile")
  })

  it("returns notFound when the event does not exist", async () => {
    const { strapi, model } = createMockStrapi()
    model(USER_UID).findFirst.mockResolvedValue({
      id: 1,
      player: { documentId: "host-1", position: "Founder" },
    })
    model(EVENT_UID).findOne.mockResolvedValue(null)
    const ctx = createMockContext({ state: { user: { id: 1 } }, params: { eventId: "missing" } })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.notFound).toHaveBeenCalledWith("Event not found")
  })

  it("returns forbidden when the user is not an organizer of the event", async () => {
    const { strapi, model } = createMockStrapi()
    model(USER_UID).findFirst.mockResolvedValue({
      id: 2,
      player: { documentId: "player-x", position: "Player" },
    })
    model(EVENT_UID).findOne.mockResolvedValue({ ...EVENT, hosts: [], mentors: [] })
    const ctx = createMockContext({
      state: { user: { id: 2 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { playerDocumentId: "ply-5" } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.forbidden).toHaveBeenCalledWith(
      "You don't have access to add participants to this event"
    )
  })

  it("returns badRequest when neither playerDocumentId nor newPlayer.name is provided", async () => {
    const { strapi } = setupOrganizer()
    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: {} } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith("Provide either playerDocumentId or newPlayer.name")
  })

  it("adds an existing player: mints a comp ticket (no order) and enrolls them", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findOne.mockResolvedValue({
      id: 5,
      documentId: "ply-5",
      name: "Jane Doe",
      user: { email: "jane@example.com" },
    })
    model(TICKET_UID).findMany.mockResolvedValue([]) // no existing tickets
    model(TICKET_TYPE_UID)
      .findFirst.mockResolvedValueOnce(null) // no "external" type yet
      .mockResolvedValueOnce(null) // no other type to inherit currency from
    model(TICKET_TYPE_UID).create.mockResolvedValue({
      id: 99,
      documentId: "tt-ext",
      name: "external",
    })
    model(TICKET_UID).create.mockResolvedValue({
      documentId: "tk-1",
      ticketCode: "TKT-TEST-1234",
      ticketStatus: "valid",
      createdAt: "2026-06-26T00:00:00.000Z",
    })

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { playerDocumentId: "ply-5" } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    // External ticket type created hidden from public sale
    expect(model(TICKET_TYPE_UID).create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "external", price: 0, isActive: false, event: 10 }),
    })

    // Ticket minted with NO order, valid status, linked to the external type/player/event
    const ticketArg = model(TICKET_UID).create.mock.calls[0][0]
    expect(ticketArg.data).toMatchObject({
      ticketCode: "TKT-TEST-1234",
      ticketStatus: "valid",
      attendeeName: "Jane Doe",
      attendeeEmail: "jane@example.com",
      ticketType: 99,
      player: 5,
      event: 10,
    })
    expect(ticketArg.data).not.toHaveProperty("order")

    // Added to the event attendee list
    expect(addPlayerToEventAttendees).toHaveBeenCalledWith(
      strapi,
      "ply-5",
      { documentId: "evt-1", id: 10 },
      "[Event]"
    )

    expect(ctx.send).toHaveBeenCalledWith({
      data: {
        participant: expect.objectContaining({
          documentId: "tk-1",
          ticketCode: "TKT-TEST-1234",
          ticketStatus: "valid",
          attendeeName: "Jane Doe",
          attendeeEmail: "jane@example.com",
          ticketType: { documentId: "tt-ext", name: "external" },
          player: { documentId: "ply-5", name: "Jane Doe" },
        }),
      },
    })
  })

  it("creates a new player when newPlayer.name is provided", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([]) // no name clash
    model(PLAYER_UID).create.mockResolvedValue({ id: 7, documentId: "ply-7", name: "New Person" })
    model(TICKET_UID).findMany.mockResolvedValue([])
    model(TICKET_TYPE_UID).findFirst.mockResolvedValue({
      id: 99,
      documentId: "tt-ext",
      name: "external",
    }) // reuse existing
    model(TICKET_UID).create.mockResolvedValue({
      documentId: "tk-2",
      ticketCode: "TKT-TEST-1234",
      ticketStatus: "valid",
      createdAt: "2026-06-26T00:00:00.000Z",
    })

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: {
        body: { data: { newPlayer: { name: "New Person", email: "new@example.com" } } },
      },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(model(PLAYER_UID).create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "New Person", position: "Player" }),
    })
    // Reused the existing external type — did not create a second one
    expect(model(TICKET_TYPE_UID).create).not.toHaveBeenCalled()
    // Email captured on the ticket from newPlayer.email
    expect(model(TICKET_UID).create.mock.calls[0][0].data).toMatchObject({
      attendeeName: "New Person",
      attendeeEmail: "new@example.com",
      ticketType: 99,
      player: 7,
    })
    expect(addPlayerToEventAttendees).toHaveBeenCalledWith(
      strapi,
      "ply-7",
      { documentId: "evt-1", id: 10 },
      "[Event]"
    )
  })

  it("rejects a new player whose name already exists", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([{ documentId: "ply-existing" }])

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { newPlayer: { name: "Existing Name" } } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      "A player with this name already exists. Select the existing player instead."
    )
    expect(model(PLAYER_UID).create).not.toHaveBeenCalled()
  })

  it("rejects a player who is already a participant", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findOne.mockResolvedValue({ id: 5, documentId: "ply-5", name: "Jane Doe" })
    model(TICKET_UID).findMany.mockResolvedValue([{ documentId: "existing-ticket" }])

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { playerDocumentId: "ply-5" } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      "This player is already a participant of this event"
    )
    expect(model(TICKET_UID).create).not.toHaveBeenCalled()
    expect(addPlayerToEventAttendees).not.toHaveBeenCalled()
  })

  it("allows a Host organizer (not just Founder) to add participants", async () => {
    const { strapi, model } = createMockStrapi()
    model(USER_UID).findFirst.mockResolvedValue({
      id: 3,
      player: { documentId: "host-3", name: "Host Three", position: "Host" },
    })
    // Host is listed in the event's hosts relation
    model(EVENT_UID).findOne.mockResolvedValue({
      ...EVENT,
      hosts: [{ documentId: "host-3" }],
    })
    model(PLAYER_UID).findOne.mockResolvedValue({ id: 5, documentId: "ply-5", name: "Jane Doe" })
    model(TICKET_UID).findMany.mockResolvedValue([])
    model(TICKET_TYPE_UID).findFirst.mockResolvedValue({
      id: 99,
      documentId: "tt-ext",
      name: "external",
    })
    model(TICKET_UID).create.mockResolvedValue({
      documentId: "tk-3",
      ticketCode: "TKT-TEST-1234",
      ticketStatus: "valid",
      createdAt: "2026-06-26T00:00:00.000Z",
    })

    const ctx = createMockContext({
      state: { user: { id: 3 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { playerDocumentId: "ply-5" } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.forbidden).not.toHaveBeenCalled()
    expect(model(TICKET_UID).create).toHaveBeenCalled()
    expect(ctx.send).toHaveBeenCalled()
  })

  it("rejects a new player with an invalid email before any writes", async () => {
    const { strapi, model } = setupOrganizer()

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { newPlayer: { name: "New Person", email: "not-an-email" } } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.badRequest).toHaveBeenCalled()
    expect(model(PLAYER_UID).create).not.toHaveBeenCalled()
    expect(model(TICKET_UID).create).not.toHaveBeenCalled()
  })

  it("retries with a suffixed slug when the base slug is already taken", async () => {
    const { strapi, model } = setupOrganizer()
    model(PLAYER_UID).findMany.mockResolvedValue([]) // no exact name clash ("Rémi" != "Remi")
    // slug "remi" is taken (a diacritic-equivalent "Remi" already exists), then free
    model(PLAYER_UID)
      .findFirst.mockResolvedValueOnce({ documentId: "ply-remi" })
      .mockResolvedValueOnce(null)
    model(PLAYER_UID).create.mockResolvedValue({ id: 8, documentId: "ply-8", name: "Rémi" })
    model(TICKET_UID).findMany.mockResolvedValue([])
    model(TICKET_TYPE_UID).findFirst.mockResolvedValue({
      id: 99,
      documentId: "tt-ext",
      name: "external",
    })
    model(TICKET_UID).create.mockResolvedValue({
      documentId: "tk-9",
      ticketCode: "TKT-TEST-1234",
      ticketStatus: "valid",
      createdAt: "2026-06-26T00:00:00.000Z",
    })

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { newPlayer: { name: "Rémi" } } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    const createArg = model(PLAYER_UID).create.mock.calls[0][0]
    expect(createArg.data.name).toBe("Rémi")
    expect(createArg.data.slug).toMatch(/^remi-[0-9a-f]+$/) // base slug "remi" + random suffix
    expect(ctx.send).toHaveBeenCalled()
  })

  it("returns badRequest when the per-event lock is already held", async () => {
    const { strapi, model } = setupOrganizer()
    vi.mocked(acquireLock).mockResolvedValueOnce(null) // lock held by a concurrent add

    const ctx = createMockContext({
      state: { user: { id: 1 } },
      params: { eventId: "evt-1" },
      request: { body: { data: { playerDocumentId: "ply-5" } } },
    })

    await customEventFactory({ strapi }).addParticipant(ctx)

    expect(ctx.badRequest).toHaveBeenCalledWith(
      "Another participant is being added to this event. Please retry."
    )
    expect(model(TICKET_UID).create).not.toHaveBeenCalled()
    expect(model(PLAYER_UID).findOne).not.toHaveBeenCalled()
  })
})
