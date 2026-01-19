/**
 * Mock Strapi factory for unit testing
 *
 * Provides a reusable mock of the Strapi instance with:
 * - Document Service API mocking
 * - In-memory database simulation
 * - Logger spies for assertion
 */

import crypto from "node:crypto"
import type { Core } from "@strapi/strapi"
import { type Mock, vi } from "vitest"

// ============================================================================
// Types
// ============================================================================

export interface MockDocumentService {
  findOne: Mock
  findMany: Mock
  findFirst: Mock
  create: Mock
  update: Mock
  delete: Mock
  count: Mock
}

export interface MockStrapi {
  documents: Mock<(collection: string) => MockDocumentService>
  log: {
    debug: Mock
    info: Mock
    warn: Mock
    error: Mock
  }
  config: {
    get: Mock
  }
}

export interface MockDatabase {
  collections: Map<string, Map<string, unknown>>
}

// ============================================================================
// Mock Strapi Factory
// ============================================================================

/**
 * Create a mock Strapi instance with in-memory database
 *
 * @example
 * ```ts
 * const { strapi, db } = createMockStrapi()
 *
 * // Add data to the mock database
 * db.collections.get("api::event.event")?.set("event-1", { name: "Test Event" })
 *
 * // Use in tests
 * await myFunction(strapi as unknown as Core.Strapi)
 * ```
 */
export function createMockStrapi(initialData?: MockDatabase): {
  strapi: MockStrapi
  db: MockDatabase
} {
  const db: MockDatabase = initialData || {
    collections: new Map(),
  }

  const documentServices = new Map<string, MockDocumentService>()

  const getDocumentService = (collection: string): MockDocumentService => {
    if (!documentServices.has(collection)) {
      // Ensure collection exists in db
      if (!db.collections.has(collection)) {
        db.collections.set(collection, new Map())
      }
      const collectionData = db.collections.get(collection)!

      documentServices.set(collection, {
        findOne: vi.fn(({ documentId }) => {
          return Promise.resolve(collectionData.get(documentId) || null)
        }),

        findMany: vi.fn(({ filters } = {}) => {
          const items = Array.from(collectionData.values())
          if (!filters) return Promise.resolve(items)

          // Basic filter support
          return Promise.resolve(
            items.filter((item) => {
              for (const [key, value] of Object.entries(filters)) {
                if ((item as Record<string, unknown>)[key] !== value) {
                  return false
                }
              }
              return true
            })
          )
        }),

        findFirst: vi.fn(({ filters } = {}) => {
          const items = Array.from(collectionData.values())
          if (!filters) return Promise.resolve(items[0] || null)

          const found = items.find((item) => {
            for (const [key, value] of Object.entries(filters)) {
              if ((item as Record<string, unknown>)[key] !== value) {
                return false
              }
            }
            return true
          })
          return Promise.resolve(found || null)
        }),

        create: vi.fn(({ data }) => {
          const documentId =
            (data as Record<string, unknown>).documentId ||
            `doc-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`
          const newItem = { ...data, documentId }
          collectionData.set(documentId as string, newItem)
          return Promise.resolve(newItem)
        }),

        update: vi.fn(({ documentId, data }) => {
          const existing = collectionData.get(documentId)
          if (existing && typeof existing === "object" && existing !== null) {
            const updated = { ...(existing as Record<string, unknown>), ...data }
            collectionData.set(documentId, updated)
            return Promise.resolve(updated)
          }
          return Promise.resolve(null)
        }),

        delete: vi.fn(({ documentId }) => {
          const existed = collectionData.has(documentId)
          collectionData.delete(documentId)
          return Promise.resolve(existed ? { documentId } : null)
        }),

        count: vi.fn(({ filters } = {}) => {
          if (!filters) {
            return Promise.resolve(collectionData.size)
          }
          const items = Array.from(collectionData.values())
          const filtered = items.filter((item) => {
            for (const [key, value] of Object.entries(filters)) {
              if ((item as Record<string, unknown>)[key] !== value) {
                return false
              }
            }
            return true
          })
          return Promise.resolve(filtered.length)
        }),
      })
    }
    return documentServices.get(collection)!
  }

  const strapi: MockStrapi = {
    documents: vi.fn((collection: string) => getDocumentService(collection)),
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    },
  }

  return { strapi, db }
}

/**
 * Cast mock strapi to the real Strapi type for use in functions
 */
export function asStrapiInstance(mockStrapi: MockStrapi): Core.Strapi {
  return mockStrapi as unknown as Core.Strapi
}

/**
 * Helper to add items to a mock database collection
 */
export function addToCollection<T extends { documentId: string }>(
  db: MockDatabase,
  collectionName: string,
  items: T[]
): void {
  if (!db.collections.has(collectionName)) {
    db.collections.set(collectionName, new Map())
  }
  const collection = db.collections.get(collectionName)!
  for (const item of items) {
    collection.set(item.documentId, item)
  }
}

/**
 * Reset all mock function calls
 */
export function resetMockStrapi(strapi: MockStrapi): void {
  strapi.documents.mockClear()
  strapi.log.debug.mockClear()
  strapi.log.info.mockClear()
  strapi.log.warn.mockClear()
  strapi.log.error.mockClear()
  strapi.config.get.mockClear()
}
