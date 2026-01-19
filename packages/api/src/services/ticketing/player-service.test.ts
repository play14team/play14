/**
 * Tests for Player Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  type AttendeeInfo,
  addPlayerToEventAttendees,
  findOrCreatePlayerForAttendee,
} from "./player-service"

// Mock crypto for predictable slug generation
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => "abcd",
    })),
  },
}))

// Mock slugify to make it predictable
vi.mock("slugify", () => ({
  default: (text: string) => text.toLowerCase().replace(/\s+/g, "-"),
}))

describe("Player Service", () => {
  let mockStrapi: any

  beforeEach(() => {
    // Reset mock strapi
    mockStrapi = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      documents: vi.fn((_contentType: string) => ({
        findOne: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      })),
    }
  })

  describe("findOrCreatePlayerForAttendee", () => {
    const validAttendee: AttendeeInfo = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      tshirtSize: "M",
      foodPreferences: "Vegetarian",
    }

    describe("input validation", () => {
      it("should reject invalid first name", async () => {
        const attendee = { ...validAttendee, firstName: "" }

        await expect(
          findOrCreatePlayerForAttendee(mockStrapi, attendee, null, "[Test]")
        ).rejects.toThrow(/First name must be at least \d+ character/)
      })

      it("should reject invalid last name", async () => {
        const attendee = { ...validAttendee, lastName: "" }

        await expect(
          findOrCreatePlayerForAttendee(mockStrapi, attendee, null, "[Test]")
        ).rejects.toThrow(/Last name must be at least \d+ character/)
      })

      it("should reject invalid email", async () => {
        const attendee = { ...validAttendee, email: "not-an-email" }

        await expect(
          findOrCreatePlayerForAttendee(mockStrapi, attendee, null, "[Test]")
        ).rejects.toThrow(/Invalid email/)
      })

      it("should accept valid input", async () => {
        mockStrapi.documents.mockReturnValue({
          findOne: vi.fn().mockResolvedValue(null),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            documentId: "new-player-123",
            name: "John Doe",
            slug: "john-doe",
          }),
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          null,
          "[Test]"
        )

        expect(result.isNew).toBe(true)
        expect(result.player.name).toBe("John Doe")
      })
    })

    describe("purchaser player matching", () => {
      it("should use purchaser player when email matches", async () => {
        const purchaserPlayer = {
          documentId: "purchaser-123",
          name: "John Doe",
        }

        mockStrapi.documents.mockReturnValue({
          findOne: vi.fn().mockResolvedValue({
            documentId: "purchaser-123",
            user: { email: "john.doe@example.com" },
          }),
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          purchaserPlayer,
          "[Test]"
        )

        expect(result.player).toEqual(purchaserPlayer)
        expect(result.isNew).toBe(false)
      })

      it("should not use purchaser player when email does not match", async () => {
        const purchaserPlayer = {
          documentId: "purchaser-123",
          name: "Jane Smith",
        }

        const findOneMock = vi.fn()
        findOneMock.mockResolvedValueOnce({
          documentId: "purchaser-123",
          user: { email: "jane.smith@example.com" },
        })

        const findFirstMock = vi.fn().mockResolvedValue(null)
        const createMock = vi.fn().mockResolvedValue({
          documentId: "new-player-456",
          name: "John Doe",
          slug: "john-doe",
        })

        mockStrapi.documents.mockReturnValue({
          findOne: findOneMock,
          findFirst: findFirstMock,
          create: createMock,
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          purchaserPlayer,
          "[Test]"
        )

        expect(result.isNew).toBe(true)
        expect(result.player.documentId).toBe("new-player-456")
      })
    })

    describe("existing user matching", () => {
      it("should find player via user email", async () => {
        const existingPlayer = {
          documentId: "existing-player",
          name: "John Doe",
        }

        mockStrapi.documents.mockReturnValue({
          findFirst: vi.fn().mockResolvedValue({
            email: "john.doe@example.com",
            player: existingPlayer,
          }),
          findOne: vi.fn().mockResolvedValue({
            documentId: "existing-player",
            defaultTshirtSize: "none",
          }),
          update: vi.fn(),
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          null,
          "[Test]"
        )

        expect(result.player).toEqual(existingPlayer)
        expect(result.isNew).toBe(false)
      })

      it("should update player preferences when finding via user email", async () => {
        const existingPlayer = {
          documentId: "existing-player",
          name: "John Doe",
        }

        const updateMock = vi.fn()

        mockStrapi.documents.mockImplementation((contentType: string) => {
          if (contentType === "plugin::users-permissions.user") {
            return {
              findFirst: vi.fn().mockResolvedValue({
                email: "john.doe@example.com",
                player: existingPlayer,
              }),
            }
          }
          return {
            findOne: vi.fn().mockResolvedValue({
              documentId: "existing-player",
              defaultTshirtSize: "none",
              defaultFoodPreferences: null,
            }),
            update: updateMock,
          }
        })

        await findOrCreatePlayerForAttendee(mockStrapi, validAttendee, null, "[Test]")

        expect(updateMock).toHaveBeenCalledWith({
          documentId: "existing-player",
          data: {
            defaultTshirtSize: "M",
            defaultFoodPreferences: "Vegetarian",
          },
        })
      })
    })

    describe("unlinked player matching", () => {
      it("should match existing unlinked player by name", async () => {
        const existingUnlinkedPlayer = {
          documentId: "unlinked-player",
          name: "John Doe",
          user: null,
        }

        mockStrapi.documents.mockReturnValue({
          findFirst: vi.fn().mockResolvedValue(existingUnlinkedPlayer),
          update: vi.fn(),
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          null,
          "[Test]"
        )

        expect(result.player.documentId).toBe("unlinked-player")
        expect(result.isNew).toBe(false)
      })

      it("should not match existing linked player by name", async () => {
        const existingLinkedPlayer = {
          documentId: "linked-player",
          name: "John Doe",
          user: { id: 1, email: "other@example.com" },
        }

        const findFirstMock = vi
          .fn()
          .mockResolvedValueOnce(existingLinkedPlayer) // findFirst by name
          .mockResolvedValue(null) // All subsequent slug checks return null (available)

        mockStrapi.documents.mockImplementation((contentType: string) => {
          if (contentType === "plugin::users-permissions.user") {
            return {
              findFirst: vi.fn().mockResolvedValue(null),
            }
          }
          return {
            findFirst: findFirstMock,
            create: vi.fn().mockResolvedValue({
              documentId: "new-player-unique",
              name: "John Doe (abcd)",
              slug: "john-doe-abcdabcd",
            }),
          }
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          null,
          "[Test]"
        )

        expect(result.isNew).toBe(true)
        expect(result.player.name).toContain("John Doe")
        expect(result.player.name).not.toBe("John Doe")
      })
    })

    describe("player creation", () => {
      it("should create new player with unique slug", async () => {
        const createMock = vi.fn().mockResolvedValue({
          documentId: "new-player",
          name: "John Doe",
          slug: "john-doe",
        })

        mockStrapi.documents.mockReturnValue({
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        })

        const result = await findOrCreatePlayerForAttendee(
          mockStrapi,
          validAttendee,
          null,
          "[Test]"
        )

        expect(result.isNew).toBe(true)
        expect(createMock).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: "John Doe",
            slug: "john-doe",
            position: "Player",
            defaultTshirtSize: "M",
            defaultFoodPreferences: "Vegetarian",
          }),
        })
      })
    })
  })

  describe("addPlayerToEventAttendees", () => {
    it("should add player to event attendees", async () => {
      const updateMock = vi.fn()

      mockStrapi.documents.mockImplementation((contentType: string) => {
        if (contentType === "api::event.event") {
          return {
            findOne: vi.fn().mockImplementation(({ status }) => {
              // Return event with id for published, null for draft
              if (status === "published") {
                return Promise.resolve({ id: 1, documentId: "event-123" })
              }
              return Promise.resolve(null)
            }),
          }
        }
        // Player content type
        return {
          findOne: vi.fn().mockResolvedValue({
            documentId: "player-123",
            attended: [],
          }),
          update: updateMock,
        }
      })

      await addPlayerToEventAttendees(
        mockStrapi,
        "player-123",
        { documentId: "event-123", id: 1 },
        "[Test]"
      )

      expect(updateMock).toHaveBeenCalledWith({
        documentId: "player-123",
        data: {
          attended: [1],
        },
      })
    })

    it("should not add player if already attending", async () => {
      const updateMock = vi.fn()

      mockStrapi.documents.mockImplementation((contentType: string) => {
        if (contentType === "api::event.event") {
          return {
            findOne: vi.fn().mockImplementation(({ status }) => {
              if (status === "published") {
                return Promise.resolve({ id: 1, documentId: "event-123" })
              }
              return Promise.resolve(null)
            }),
          }
        }
        return {
          findOne: vi.fn().mockResolvedValue({
            documentId: "player-123",
            attended: [{ id: 1, documentId: "event-123" }],
          }),
          update: updateMock,
        }
      })

      await addPlayerToEventAttendees(
        mockStrapi,
        "player-123",
        { documentId: "event-123", id: 1 },
        "[Test]"
      )

      expect(updateMock).not.toHaveBeenCalled()
    })

    it("should handle player not found", async () => {
      mockStrapi.documents.mockImplementation((contentType: string) => {
        if (contentType === "api::event.event") {
          return {
            findOne: vi.fn().mockImplementation(({ status }) => {
              if (status === "published") {
                return Promise.resolve({ id: 1, documentId: "event-123" })
              }
              return Promise.resolve(null)
            }),
          }
        }
        // Player returns null
        return {
          findOne: vi.fn().mockResolvedValue(null),
        }
      })

      await addPlayerToEventAttendees(
        mockStrapi,
        "player-123",
        { documentId: "event-123", id: 1 },
        "[Test]"
      )

      // Should not throw
    })
  })
})
