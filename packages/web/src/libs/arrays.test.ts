/**
 * Unit tests for array utilities
 */

import { describe, expect, it } from "vitest"
import { deduplicate, deduplicateBy, shuffleArray } from "./arrays"

describe("deduplicate", () => {
  describe("single array", () => {
    it("removes duplicates from a single array", () => {
      const result = deduplicate([1, 2, 2, 3, 3, 3])

      expect(result).toEqual([1, 2, 3])
    })

    it("returns empty array for empty input", () => {
      const result = deduplicate([])

      expect(result).toEqual([])
    })

    it("returns same array if no duplicates", () => {
      const result = deduplicate([1, 2, 3])

      expect(result).toEqual([1, 2, 3])
    })

    it("works with strings", () => {
      const result = deduplicate(["a", "b", "a", "c", "b"])

      expect(result).toEqual(["a", "b", "c"])
    })
  })

  describe("multiple arrays", () => {
    it("combines and deduplicates multiple arrays", () => {
      const result = deduplicate([1, 2], [2, 3], [3, 4])

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("handles arrays with no overlap", () => {
      const result = deduplicate([1, 2], [3, 4], [5, 6])

      expect(result).toEqual([1, 2, 3, 4, 5, 6])
    })

    it("handles arrays with complete overlap", () => {
      const result = deduplicate([1, 2, 3], [1, 2, 3], [1, 2, 3])

      expect(result).toEqual([1, 2, 3])
    })

    it("handles mix of empty and non-empty arrays", () => {
      const result = deduplicate([1, 2], [], [3, 4])

      expect(result).toEqual([1, 2, 3, 4])
    })

    it("handles all empty arrays", () => {
      const result = deduplicate([], [], [])

      expect(result).toEqual([])
    })
  })

  describe("with objects (by reference)", () => {
    it("does not deduplicate different objects with same content", () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 1 }
      const result = deduplicate([obj1, obj2])

      // Objects are compared by reference, not value
      expect(result).toHaveLength(2)
    })

    it("deduplicates same object references", () => {
      const obj = { id: 1 }
      const result = deduplicate([obj, obj, obj])

      expect(result).toEqual([obj])
    })
  })

  describe("preserves order", () => {
    it("maintains first occurrence order", () => {
      const result = deduplicate([3, 1, 2, 1, 3, 2])

      expect(result).toEqual([3, 1, 2])
    })

    it("maintains order across multiple arrays", () => {
      const result = deduplicate([3], [1, 3], [2, 1])

      expect(result).toEqual([3, 1, 2])
    })
  })
})

describe("deduplicateBy", () => {
  it("deduplicates by key across arrays", () => {
    const result = deduplicateBy(
      (item) => item.id,
      [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
      ],
      [{ id: "a", value: 3 }]
    )

    expect(result).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ])
  })

  it("keeps items with missing keys", () => {
    const result = deduplicateBy(
      (item) => item.id,
      [{ id: "a" }, { id: null }, { id: "b" }, { id: undefined }],
      [{ id: "a" }]
    )

    expect(result).toEqual([{ id: "a" }, { id: null }, { id: "b" }, { id: undefined }])
  })
})

describe("shuffleArray", () => {
  describe("basic functionality", () => {
    it("returns array with same length", () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(original)

      expect(shuffled.length).toBe(original.length)
    })

    it("contains all original elements", () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(original)

      expect(shuffled.sort()).toEqual(original.sort())
    })

    it("does not modify original array", () => {
      const original = [1, 2, 3, 4, 5]
      const originalCopy = [...original]
      shuffleArray(original)

      expect(original).toEqual(originalCopy)
    })

    it("returns new array instance", () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(original)

      expect(shuffled).not.toBe(original)
    })
  })

  describe("edge cases", () => {
    it("handles empty array", () => {
      const result = shuffleArray([])

      expect(result).toEqual([])
    })

    it("handles single element array", () => {
      const result = shuffleArray([1])

      expect(result).toEqual([1])
    })

    it("handles two element array", () => {
      const original = [1, 2]
      const shuffled = shuffleArray(original)

      expect(shuffled).toHaveLength(2)
      expect(shuffled.sort()).toEqual([1, 2])
    })
  })

  describe("with different types", () => {
    it("works with strings", () => {
      const original = ["a", "b", "c", "d"]
      const shuffled = shuffleArray(original)

      expect(shuffled).toHaveLength(4)
      expect(shuffled.sort()).toEqual(["a", "b", "c", "d"])
    })

    it("works with objects", () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const obj3 = { id: 3 }
      const original = [obj1, obj2, obj3]
      const shuffled = shuffleArray(original)

      expect(shuffled).toHaveLength(3)
      expect(shuffled).toContain(obj1)
      expect(shuffled).toContain(obj2)
      expect(shuffled).toContain(obj3)
    })

    it("works with mixed types", () => {
      const original = [1, "a", true, null]
      const shuffled = shuffleArray(original)

      expect(shuffled).toHaveLength(4)
      expect(shuffled).toContain(1)
      expect(shuffled).toContain("a")
      expect(shuffled).toContain(true)
      expect(shuffled).toContain(null)
    })
  })

  describe("randomness (statistical)", () => {
    it("produces different orderings over many shuffles", () => {
      const original = [1, 2, 3, 4, 5]
      const orderings = new Set<string>()

      // Run 100 shuffles and collect unique orderings
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffleArray(original)
        orderings.add(shuffled.join(","))
      }

      // With 5 elements, there are 120 possible orderings
      // We should see multiple different orderings
      expect(orderings.size).toBeGreaterThan(1)
    })

    it("does not always return same order", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      let sameOrderCount = 0

      for (let i = 0; i < 10; i++) {
        const shuffled = shuffleArray(original)
        if (shuffled.join(",") === original.join(",")) {
          sameOrderCount++
        }
      }

      // It's extremely unlikely to get the same order every time
      expect(sameOrderCount).toBeLessThan(10)
    })
  })

  describe("Fisher-Yates algorithm properties", () => {
    it("each position can contain any element", () => {
      const original = [1, 2, 3]
      const positionCounts = {
        0: new Set<number>(),
        1: new Set<number>(),
        2: new Set<number>(),
      }

      // Run many shuffles to see what appears at each position
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffleArray(original)
        positionCounts[0].add(shuffled[0])
        positionCounts[1].add(shuffled[1])
        positionCounts[2].add(shuffled[2])
      }

      // Each position should eventually see all three elements
      expect(positionCounts[0].size).toBe(3)
      expect(positionCounts[1].size).toBe(3)
      expect(positionCounts[2].size).toBe(3)
    })
  })
})
