import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getPlayerByDocumentId,
  uploadPlayerPicture,
  deletePlayerPicture,
  type PlayerProfile,
} from "./players"
import * as strapiClient from "@/libs/strapi-client"
import type { Player } from "@/models/strapi"

// Mock the strapi-client module
vi.mock("@/libs/strapi-client", () => ({
  restQuery: vi.fn(),
  strapiFetch: vi.fn(),
  strapiFetchFormData: vi.fn(),
}))

describe("Player API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getPlayerByDocumentId", () => {
    it("should return player when found", async () => {
      const mockPlayer: Player = {
        documentId: "player123",
        name: "John Doe",
        slug: "john-doe",
        position: "Player",
        company: "Test Corp",
        tagline: "Test tagline",
        bio: "Test bio",
      } as Player

      vi.mocked(strapiClient.restQuery).mockResolvedValue({
        data: [mockPlayer],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
      })

      const result = await getPlayerByDocumentId("player123")

      expect(result).toEqual(mockPlayer)
      expect(strapiClient.restQuery).toHaveBeenCalledWith("players", {
        filters: {
          documentId: { $eq: "player123" },
        },
        populate: {
          avatar: {
            fields: ["name", "url", "width", "height"],
          },
          socialNetworks: {
            fields: ["id", "url", "type"],
          },
        },
      })
    })

    it("should return null when player not found", async () => {
      vi.mocked(strapiClient.restQuery).mockResolvedValue({
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
      })

      const result = await getPlayerByDocumentId("nonexistent")

      expect(result).toBeNull()
    })

    it("should return null when response data is null", async () => {
      vi.mocked(strapiClient.restQuery).mockResolvedValue({
        data: null,
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
      })

      const result = await getPlayerByDocumentId("player123")

      expect(result).toBeNull()
    })

    it("should return null when player has no documentId", async () => {
      const mockPlayer = {
        name: "John Doe",
        slug: "john-doe",
        // Missing documentId
      } as Player

      vi.mocked(strapiClient.restQuery).mockResolvedValue({
        data: [mockPlayer],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 } },
      })

      const result = await getPlayerByDocumentId("player123")

      expect(result).toBeNull()
    })
  })

  describe("uploadPlayerPicture", () => {
    it("should successfully upload a picture", async () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })
      const mockPlayer: PlayerProfile = {
        documentId: "player123",
        name: "John Doe",
        slug: "john-doe",
        position: "Player",
      }

      vi.mocked(strapiClient.strapiFetchFormData).mockResolvedValue({
        ok: true,
        status: 200,
        data: { data: mockPlayer },
      })

      const result = await uploadPlayerPicture(mockFile)

      expect(result).toEqual({
        success: true,
        player: mockPlayer,
      })
      expect(strapiClient.strapiFetchFormData).toHaveBeenCalledWith(
        "/players/me/picture",
        {},
        expect.any(FormData)
      )
    })

    it("should handle upload failure", async () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })

      vi.mocked(strapiClient.strapiFetchFormData).mockResolvedValue({
        ok: false,
        status: 400,
        error: "Upload failed",
      })

      const result = await uploadPlayerPicture(mockFile)

      expect(result).toEqual({
        success: false,
        error: "Upload failed",
      })
    })

    it("should use default error message when error is undefined", async () => {
      const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" })

      vi.mocked(strapiClient.strapiFetchFormData).mockResolvedValue({
        ok: false,
        status: 500,
        error: undefined,
      })

      const result = await uploadPlayerPicture(mockFile)

      expect(result).toEqual({
        success: false,
        error: "Failed to upload picture",
      })
    })
  })

  describe("deletePlayerPicture", () => {
    it("should successfully delete a picture", async () => {
      const mockPlayer: PlayerProfile = {
        documentId: "player123",
        name: "John Doe",
        slug: "john-doe",
        position: "Player",
      }

      vi.mocked(strapiClient.strapiFetch).mockResolvedValue({
        ok: true,
        status: 200,
        data: { data: mockPlayer },
      })

      const result = await deletePlayerPicture()

      expect(result).toEqual({
        success: true,
        player: mockPlayer,
      })
      expect(strapiClient.strapiFetch).toHaveBeenCalledWith(
        "/players/me/picture",
        {},
        { method: "DELETE" }
      )
    })

    it("should handle delete failure", async () => {
      vi.mocked(strapiClient.strapiFetch).mockResolvedValue({
        ok: false,
        status: 400,
        error: "Delete failed",
      })

      const result = await deletePlayerPicture()

      expect(result).toEqual({
        success: false,
        error: "Delete failed",
      })
    })

    it("should use default error message when error is undefined", async () => {
      vi.mocked(strapiClient.strapiFetch).mockResolvedValue({
        ok: false,
        status: 500,
        error: undefined,
      })

      const result = await deletePlayerPicture()

      expect(result).toEqual({
        success: false,
        error: "Failed to delete picture",
      })
    })
  })
})
