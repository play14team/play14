import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "e2e", "tests"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/libs/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Mock server-only for testing
      "server-only": resolve(__dirname, "./src/__mocks__/server-only.ts"),
    },
  },
})
