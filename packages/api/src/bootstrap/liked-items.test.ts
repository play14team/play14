import * as fs from "node:fs"
import type { Core } from "@strapi/strapi"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { bootstrapLikedItemImages } from "./liked-items"

// Mock the fs module
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
}))

/**
 * Creates a mock Strapi instance for testing the bootstrap function
 */
const createMockStrapi = () => {
  const documentsFindFirst = vi.fn()

  // Separate mocks for different table queries
  const folderQueryFindOne = vi.fn()
  const folderQueryFindMany = vi.fn()
  const folderQueryCreate = vi.fn()
  const likedItemQueryFindOne = vi.fn()

  const uploadServiceUpload = vi.fn()

  const strapi = {
    documents: vi.fn(() => ({
      findFirst: documentsFindFirst,
    })),
    plugin: vi.fn(() => ({
      service: vi.fn(() => ({
        upload: uploadServiceUpload,
      })),
    })),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    db: {
      query: vi.fn((uid: string) => {
        if (uid === "plugin::upload.folder") {
          return {
            findOne: folderQueryFindOne,
            findMany: folderQueryFindMany,
            create: folderQueryCreate,
          }
        }
        if (uid === "api::liked-item.liked-item") {
          return {
            findOne: likedItemQueryFindOne,
          }
        }
        return {
          findOne: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
        }
      }),
    },
  } as unknown as Core.Strapi

  return {
    strapi,
    documentsFindFirst,
    folderQueryFindOne,
    folderQueryFindMany,
    folderQueryCreate,
    likedItemQueryFindOne,
    uploadServiceUpload,
  }
}

describe("bootstrapLikedItemImages", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("skips when images directory does not exist", async () => {
    const { strapi } = createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(false)

    await bootstrapLikedItemImages(strapi)

    expect(strapi.log.info).toHaveBeenCalledWith(
      "[Bootstrap] Liked items images directory not found, skipping image upload"
    )
  })

  it("skips items that are not found in the database", async () => {
    const { strapi, documentsFindFirst, folderQueryFindOne, folderQueryFindMany } =
      createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(true)
    documentsFindFirst.mockResolvedValue(null)
    // Mock folder creation for getOrCreateMediaFolder
    folderQueryFindOne.mockResolvedValue({ id: 1, pathId: 1, path: "/1" })
    folderQueryFindMany.mockResolvedValue([{ pathId: 1 }])

    await bootstrapLikedItemImages(strapi)

    expect(strapi.log.debug).toHaveBeenCalledWith(expect.stringContaining("not found, skipping"))
  })

  it("skips items that already have an image", async () => {
    const { strapi, documentsFindFirst, folderQueryFindOne, folderQueryFindMany } =
      createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(true)
    documentsFindFirst.mockResolvedValue({
      documentId: "item-1",
      name: "ISAGA",
      image: { id: 1, url: "/uploads/existing.jpg" },
    })
    folderQueryFindOne.mockResolvedValue({ id: 1, pathId: 1, path: "/1" }) // folder exists
    folderQueryFindMany.mockResolvedValue([{ pathId: 1 }])

    await bootstrapLikedItemImages(strapi)

    expect(strapi.log.debug).toHaveBeenCalledWith(
      expect.stringContaining("already has an image, skipping")
    )
  })

  it("warns when image file does not exist locally", async () => {
    const { strapi, documentsFindFirst, folderQueryFindOne, folderQueryFindMany } =
      createMockStrapi()

    // First call for directory check, subsequent calls for file checks
    ;(fs.existsSync as any)
      .mockReturnValueOnce(true) // directory exists
      .mockReturnValue(false) // file does not exist

    documentsFindFirst.mockResolvedValue({
      documentId: "item-1",
      name: "ISAGA",
      image: null,
    })
    folderQueryFindOne.mockResolvedValue({ id: 1, pathId: 1, path: "/1" }) // folder exists
    folderQueryFindMany.mockResolvedValue([{ pathId: 1 }])

    await bootstrapLikedItemImages(strapi)

    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining("Image file not found"))
  })

  it("uploads images for items without images", async () => {
    const {
      strapi,
      documentsFindFirst,
      folderQueryFindOne,
      folderQueryFindMany,
      likedItemQueryFindOne,
      uploadServiceUpload,
    } = createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(true)
    ;(fs.statSync as any).mockReturnValue({ size: 12345 })

    documentsFindFirst.mockResolvedValue({
      documentId: "item-1",
      name: "ISAGA",
      image: null,
    })

    // Mock folder queries - folder exists
    folderQueryFindOne.mockResolvedValue({ id: 1, pathId: 1, path: "/1" })
    folderQueryFindMany.mockResolvedValue([{ pathId: 1 }])

    // Mock internal item lookup
    likedItemQueryFindOne.mockResolvedValue({ document_id: "item-1", id: 100 })

    uploadServiceUpload.mockResolvedValue([{ id: 1, url: "/uploads/isaga.png" }])

    await bootstrapLikedItemImages(strapi)

    expect(uploadServiceUpload).toHaveBeenCalled()
    expect(strapi.log.info).toHaveBeenCalledWith(
      expect.stringContaining("Uploaded and linked image")
    )
  })

  it("creates the liked-items folder if it does not exist", async () => {
    const {
      strapi,
      documentsFindFirst,
      folderQueryFindOne,
      folderQueryFindMany,
      folderQueryCreate,
      likedItemQueryFindOne,
      uploadServiceUpload,
    } = createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(true)
    ;(fs.statSync as any).mockReturnValue({ size: 12345 })

    documentsFindFirst.mockResolvedValue({
      documentId: "item-1",
      name: "ISAGA",
      image: null,
    })

    // Mock: folder does not exist, then gets created
    folderQueryFindOne.mockResolvedValue(null)
    folderQueryFindMany.mockResolvedValue([]) // No existing folders
    folderQueryCreate.mockResolvedValue({ id: 1, pathId: 1, path: "/1", name: "liked-items" })

    // Mock internal item lookup
    likedItemQueryFindOne.mockResolvedValue({ document_id: "item-1", id: 100 })

    uploadServiceUpload.mockResolvedValue([{ id: 1, url: "/uploads/isaga.png" }])

    await bootstrapLikedItemImages(strapi)

    expect(folderQueryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "liked-items",
          parent: null,
        }),
      })
    )
    expect(strapi.log.info).toHaveBeenCalledWith(expect.stringContaining("Created media folder"))
  })

  it("handles upload errors gracefully", async () => {
    const {
      strapi,
      documentsFindFirst,
      folderQueryFindOne,
      folderQueryFindMany,
      likedItemQueryFindOne,
      uploadServiceUpload,
    } = createMockStrapi()
    ;(fs.existsSync as any).mockReturnValue(true)
    ;(fs.statSync as any).mockReturnValue({ size: 12345 })

    documentsFindFirst.mockResolvedValue({
      documentId: "item-1",
      name: "ISAGA",
      image: null,
    })

    folderQueryFindOne.mockResolvedValue({ id: 1, pathId: 1, path: "/1" }) // folder exists
    folderQueryFindMany.mockResolvedValue([{ pathId: 1 }])
    likedItemQueryFindOne.mockResolvedValue({ document_id: "item-1", id: 100 }) // internal item

    uploadServiceUpload.mockRejectedValue(new Error("Upload failed"))

    await bootstrapLikedItemImages(strapi)

    expect(strapi.log.error).toHaveBeenCalledWith(expect.stringContaining("Error processing image"))
    // Should still complete without throwing
    expect(strapi.log.info).toHaveBeenCalledWith("[Bootstrap] Liked items image bootstrap complete")
  })
})
