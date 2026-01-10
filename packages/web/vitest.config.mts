import { defineConfig } from "vitest/config"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "e2e", "tests", "src/test-utils/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/libs/**/*.ts", "src/libs/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "src/test-utils/**"],
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
