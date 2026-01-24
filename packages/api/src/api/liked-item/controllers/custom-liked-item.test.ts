import type { Core } from "@strapi/strapi"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Import the controller factory
import customLikedItemFactory from "./custom-liked-item"

/**
 * Creates a mock Strapi instance for testing the liked-item controller
 */
const createMockStrapi = () => {
  const documentsFindMany = vi.fn()
  const documentsFindOne = vi.fn()
  const documentsFindFirst = vi.fn()
  const documentsCreate = vi.fn()
  const documentsUpdate = vi.fn()
  const documentsDelete = vi.fn()

  const documentsResult = {
    findMany: documentsFindMany,
    findOne: documentsFindOne,
    findFirst: documentsFindFirst,
    create: documentsCreate,
    update: documentsUpdate,
    delete: documentsDelete,
  }

  const dbQueryFindOne = vi.fn()
  const dbQueryFindMany = vi.fn()
  const dbQueryCreate = vi.fn()

  const strapi = {
    documents: vi.fn(() => documentsResult),
    log: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
    db: {
      query: vi.fn(() => ({
        findOne: dbQueryFindOne,
        findMany: dbQueryFindMany,
        create: dbQueryCreate,
      })),
    },
    plugins: {
      upload: {
        services: {
          upload: {
            upload: vi.fn(),
            findOne: vi.fn(),
          },
        },
      },
    },
  } as unknown as Core.Strapi

  return {
    strapi,
    documentsFindMany,
    documentsFindOne,
    documentsFindFirst,
    documentsCreate,
    documentsUpdate,
    documentsDelete,
    dbQueryFindOne,
    dbQueryFindMany,
    dbQueryCreate,
  }
}

/**
 * Creates a mock Koa context for testing controller methods
 */
const createMockContext = (overrides: Partial<any> = {}) => {
  const ctx = {
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
  }
  return ctx
}

describe("custom-liked-item controller", () => {
  describe("requireFounder authorization", () => {
    it("returns unauthorized when no user is logged in", async () => {
      const { strapi } = createMockStrapi()
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext()

      await controller.list(ctx)

      expect(ctx.unauthorized).toHaveBeenCalledWith("You must be logged in")
      expect(ctx.send).not.toHaveBeenCalled()
    })

    it("returns forbidden when user has no linked player", async () => {
      const { strapi, documentsFindFirst } = createMockStrapi()
      documentsFindFirst.mockResolvedValue({ id: 1, player: null })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
      })

      await controller.list(ctx)

      expect(ctx.forbidden).toHaveBeenCalledWith("You must have a linked player profile")
      expect(ctx.send).not.toHaveBeenCalled()
    })

    it("returns forbidden when user is not a founder", async () => {
      const { strapi, documentsFindFirst } = createMockStrapi()
      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Host" },
      })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
      })

      await controller.list(ctx)

      expect(ctx.forbidden).toHaveBeenCalledWith("Only founders can manage liked items")
      expect(ctx.send).not.toHaveBeenCalled()
    })
  })

  describe("list", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindMany: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindMany = mocks.documentsFindMany

      // Setup founder user
      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("lists all items for a founder", async () => {
      const mockItems = [
        {
          documentId: "item-1",
          name: "Test Item",
          description: "Test description",
          url: "https://example.com",
          image: { url: "/uploads/test.jpg", formats: {} },
          contributors: [],
        },
      ]
      documentsFindMany.mockResolvedValue(mockItems)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        query: { page: 1, pageSize: 25 },
      })

      await controller.list(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: [
          {
            documentId: "item-1",
            name: "Test Item",
            description: "Test description",
            url: "https://example.com",
            image: { url: "/uploads/test.jpg", formats: {} },
            contributors: [],
            contributorsCount: 0,
          },
        ],
        meta: {
          pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 1,
            total: 1,
          },
        },
      })
    })

    it("filters items by search term", async () => {
      const mockItems = [
        { documentId: "1", name: "Alpha", description: "First item", url: "https://alpha.com" },
        { documentId: "2", name: "Beta", description: "Second item", url: "https://beta.com" },
      ]
      documentsFindMany.mockResolvedValue(mockItems)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        query: { search: "alpha", page: 1, pageSize: 25 },
      })

      await controller.list(ctx)

      expect(ctx.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ name: "Alpha" })]),
          meta: expect.objectContaining({
            pagination: expect.objectContaining({ total: 1 }),
          }),
        })
      )
    })

    it("sorts items alphabetically", async () => {
      const mockItems = [
        { documentId: "1", name: "Zebra", description: "", url: "" },
        { documentId: "2", name: "Apple", description: "", url: "" },
        { documentId: "3", name: "Mango", description: "", url: "" },
      ]
      documentsFindMany.mockResolvedValue(mockItems)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        query: { page: 1, pageSize: 25 },
      })

      await controller.list(ctx)

      const response = ctx.send.mock.calls[0][0]
      expect(response.data.map((i: any) => i.name)).toEqual(["Apple", "Mango", "Zebra"])
    })
  })

  describe("findOne", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindOne: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindOne = mocks.documentsFindOne

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when no ID is provided", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: {},
      })

      await controller.findOne(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Liked item ID is required")
    })

    it("returns 404 when item not found", async () => {
      documentsFindOne.mockResolvedValue(null)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "nonexistent" },
      })

      await controller.findOne(ctx)

      expect(ctx.notFound).toHaveBeenCalledWith("Liked item not found")
    })

    it("returns item details when found", async () => {
      const mockItem = {
        documentId: "item-1",
        name: "Test Item",
        description: "Test description",
        url: "https://example.com",
        image: { id: 1, url: "/uploads/test.jpg", formats: {} },
        contributors: [
          {
            documentId: "player-1",
            name: "Player One",
            slug: "player-one",
            avatar: { url: "/avatars/p1.jpg", formats: {} },
          },
        ],
      }
      documentsFindOne.mockResolvedValue(mockItem)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
      })

      await controller.findOne(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          documentId: "item-1",
          name: "Test Item",
          description: "Test description",
          url: "https://example.com",
          image: { id: 1, url: "/uploads/test.jpg", formats: {} },
          contributors: [
            {
              documentId: "player-1",
              name: "Player One",
              slug: "player-one",
              avatar: { url: "/avatars/p1.jpg", formats: {} },
            },
          ],
        },
      })
    })
  })

  describe("create", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindMany: ReturnType<typeof vi.fn>
    let documentsCreate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindMany = mocks.documentsFindMany
      documentsCreate = mocks.documentsCreate

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when name is missing", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        request: { body: { data: { url: "https://example.com" } } },
      })

      await controller.create(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Name is required")
    })

    it("returns 400 when URL is missing", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        request: { body: { data: { name: "Test Item" } } },
      })

      await controller.create(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("URL is required")
    })

    it("returns 400 when item with same name already exists", async () => {
      documentsFindMany.mockResolvedValue([{ documentId: "existing", name: "Test Item" }])

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        request: { body: { data: { name: "Test Item", url: "https://example.com" } } },
      })

      await controller.create(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("A liked item with this name already exists")
    })

    it("creates a new item successfully", async () => {
      documentsFindMany.mockResolvedValue([])
      documentsCreate.mockResolvedValue({
        documentId: "new-item",
        name: "New Item",
        description: "A new liked item",
        url: "https://newitem.com",
      })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        request: {
          body: {
            data: {
              name: "New Item",
              description: "A new liked item",
              url: "https://newitem.com",
            },
          },
        },
      })

      await controller.create(ctx)

      expect(documentsCreate).toHaveBeenCalledWith({
        data: {
          name: "New Item",
          description: "A new liked item",
          url: "https://newitem.com",
          contributors: [],
        },
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          documentId: "new-item",
          name: "New Item",
          description: "A new liked item",
          url: "https://newitem.com",
        },
      })
    })
  })

  describe("update", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindOne: ReturnType<typeof vi.fn>
    let documentsFindMany: ReturnType<typeof vi.fn>
    let documentsUpdate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindOne = mocks.documentsFindOne
      documentsFindMany = mocks.documentsFindMany
      documentsUpdate = mocks.documentsUpdate

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when no ID is provided", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: {},
      })

      await controller.update(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Liked item ID is required")
    })

    it("returns 404 when item not found", async () => {
      documentsFindOne.mockResolvedValue(null)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "nonexistent" },
      })

      await controller.update(ctx)

      expect(ctx.notFound).toHaveBeenCalledWith("Liked item not found")
    })

    it("returns 400 when renaming to an existing name", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Original Name" })
      documentsFindMany.mockResolvedValue([{ documentId: "item-2", name: "Existing Name" }])

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
        request: { body: { data: { name: "Existing Name" } } },
      })

      await controller.update(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("A liked item with this name already exists")
    })

    it("updates item successfully", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Original Name" })
      documentsFindMany.mockResolvedValue([])
      documentsUpdate.mockResolvedValue({
        documentId: "item-1",
        name: "Updated Name",
        description: "Updated description",
        url: "https://updated.com",
        image: null,
        contributors: [],
      })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
        request: {
          body: {
            data: {
              name: "Updated Name",
              description: "Updated description",
              url: "https://updated.com",
            },
          },
        },
      })

      await controller.update(ctx)

      expect(documentsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "item-1",
          data: {
            name: "Updated Name",
            description: "Updated description",
            url: "https://updated.com",
          },
        })
      )
      expect(ctx.send).toHaveBeenCalled()
    })
  })

  describe("delete", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindOne: ReturnType<typeof vi.fn>
    let documentsDelete: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindOne = mocks.documentsFindOne
      documentsDelete = mocks.documentsDelete

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when no ID is provided", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: {},
      })

      await controller.delete(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Liked item ID is required")
    })

    it("returns 404 when item not found", async () => {
      documentsFindOne.mockResolvedValue(null)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "nonexistent" },
      })

      await controller.delete(ctx)

      expect(ctx.notFound).toHaveBeenCalledWith("Liked item not found")
    })

    it("deletes item successfully", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Test Item" })
      documentsDelete.mockResolvedValue(undefined)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
      })

      await controller.delete(ctx)

      expect(documentsDelete).toHaveBeenCalledWith({ documentId: "item-1" })
      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          documentId: "item-1",
          deleted: true,
        },
      })
    })
  })

  describe("listPublic", () => {
    it("returns all items without authentication", async () => {
      const { strapi, documentsFindMany } = createMockStrapi()

      const mockItems = [
        {
          documentId: "item-1",
          name: "Public Item",
          description: "A public item",
          url: "https://public.com",
          image: { url: "/uploads/public.jpg", formats: {} },
          contributors: [],
        },
      ]
      documentsFindMany.mockResolvedValue(mockItems)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext()

      await controller.listPublic(ctx)

      expect(ctx.send).toHaveBeenCalledWith({
        data: [
          {
            documentId: "item-1",
            name: "Public Item",
            description: "A public item",
            url: "https://public.com",
            image: { url: "/uploads/public.jpg", formats: {} },
            contributors: [],
          },
        ],
      })
    })

    it("sorts items alphabetically", async () => {
      const { strapi, documentsFindMany } = createMockStrapi()

      const mockItems = [
        { documentId: "1", name: "Zebra", description: "", url: "" },
        { documentId: "2", name: "Apple", description: "", url: "" },
      ]
      documentsFindMany.mockResolvedValue(mockItems)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext()

      await controller.listPublic(ctx)

      const response = ctx.send.mock.calls[0][0]
      expect(response.data.map((i: any) => i.name)).toEqual(["Apple", "Zebra"])
    })

    it("handles errors gracefully", async () => {
      const { strapi, documentsFindMany } = createMockStrapi()
      documentsFindMany.mockRejectedValue(new Error("Database error"))

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext()

      await controller.listPublic(ctx)

      expect(ctx.internalServerError).toHaveBeenCalledWith("Failed to list liked items")
    })
  })

  describe("removeImage", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindOne: ReturnType<typeof vi.fn>
    let documentsUpdate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindOne = mocks.documentsFindOne
      documentsUpdate = mocks.documentsUpdate

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when no ID is provided", async () => {
      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: {},
      })

      await controller.removeImage(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("Liked item ID is required")
    })

    it("returns 404 when item not found", async () => {
      documentsFindOne.mockResolvedValue(null)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "nonexistent" },
      })

      await controller.removeImage(ctx)

      expect(ctx.notFound).toHaveBeenCalledWith("Liked item not found")
    })

    it("removes image successfully", async () => {
      documentsFindOne.mockResolvedValue({
        documentId: "item-1",
        name: "Test Item",
        image: { id: 1 },
      })
      documentsUpdate.mockResolvedValue({ documentId: "item-1", image: null })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
      })

      await controller.removeImage(ctx)

      expect(documentsUpdate).toHaveBeenCalledWith({
        documentId: "item-1",
        data: { image: null },
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: { success: true },
      })
    })
  })

  describe("setImageFromLibrary", () => {
    let strapi: Core.Strapi
    let documentsFindFirst: ReturnType<typeof vi.fn>
    let documentsFindOne: ReturnType<typeof vi.fn>
    let documentsUpdate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const mocks = createMockStrapi()
      strapi = mocks.strapi
      documentsFindFirst = mocks.documentsFindFirst
      documentsFindOne = mocks.documentsFindOne
      documentsUpdate = mocks.documentsUpdate
      ;(strapi.plugins.upload.services.upload.findOne as any).mockResolvedValue({
        id: 123,
        name: "library-image.jpg",
        url: "/uploads/library-image.jpg",
        width: 800,
        height: 600,
        formats: {},
      })

      documentsFindFirst.mockResolvedValue({
        id: 1,
        player: { position: "Founder" },
      })
    })

    it("returns 400 when fileId is missing", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Test Item" })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
        request: { body: { data: {} } },
      })

      await controller.setImageFromLibrary(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("fileId is required")
    })

    it("returns 400 when file not found in library", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Test Item" })
      ;(strapi.plugins.upload.services.upload.findOne as any).mockResolvedValue(null)

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
        request: { body: { data: { fileId: 999 } } },
      })

      await controller.setImageFromLibrary(ctx)

      expect(ctx.badRequest).toHaveBeenCalledWith("File not found in media library")
    })

    it("sets image from library successfully", async () => {
      documentsFindOne.mockResolvedValue({ documentId: "item-1", name: "Test Item" })
      documentsUpdate.mockResolvedValue({ documentId: "item-1" })

      const controller = customLikedItemFactory({ strapi })
      const ctx = createMockContext({
        state: { user: { id: 1 } },
        params: { id: "item-1" },
        request: { body: { data: { fileId: 123 } } },
      })

      await controller.setImageFromLibrary(ctx)

      expect(documentsUpdate).toHaveBeenCalledWith({
        documentId: "item-1",
        data: { image: 123 },
      })
      expect(ctx.send).toHaveBeenCalledWith({
        data: {
          id: 123,
          name: "library-image.jpg",
          url: "/uploads/library-image.jpg",
          width: 800,
          height: 600,
          formats: {},
        },
      })
    })
  })
})
