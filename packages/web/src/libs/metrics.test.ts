import { describe, expect, it, vi } from "vitest"
import { getContentType, getMetrics, getRegistry } from "./metrics"

// Mock prom-client
vi.mock("prom-client", () => {
  const mockMetrics = vi.fn().mockResolvedValue("# Mock metrics")
  const mockContentType = "text/plain; version=0.0.4"

  return {
    default: {
      Registry: class MockRegistry {
        metrics = mockMetrics
        contentType = mockContentType
        setDefaultLabels = vi.fn()
      },
      collectDefaultMetrics: vi.fn(),
      Histogram: vi.fn(),
      Counter: vi.fn(),
    },
  }
})

describe("Metrics", () => {
  describe("getRegistry", () => {
    it("should return a registry instance", () => {
      const registry = getRegistry()
      expect(registry).toBeDefined()
    })

    it("should return the same registry on subsequent calls (singleton)", () => {
      const registry1 = getRegistry()
      const registry2 = getRegistry()
      expect(registry1).toBe(registry2)
    })

    it("should have a metrics method", () => {
      const registry = getRegistry()
      expect(registry.metrics).toBeDefined()
      expect(typeof registry.metrics).toBe("function")
    })

    it("should have a contentType property", () => {
      const registry = getRegistry()
      expect(registry.contentType).toBeDefined()
      expect(typeof registry.contentType).toBe("string")
    })
  })

  describe("getMetrics", () => {
    it("should return metrics as a string", async () => {
      const metrics = await getMetrics()
      expect(typeof metrics).toBe("string")
    })
  })

  describe("getContentType", () => {
    it("should return the content type string", () => {
      const contentType = getContentType()
      expect(typeof contentType).toBe("string")
    })
  })
})
