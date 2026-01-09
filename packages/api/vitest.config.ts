import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "src/plugins/**/node_modules"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/services/**/*.ts"],
    },
  },
})
