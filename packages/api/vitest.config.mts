import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: [
      "node_modules",
      "src/plugins/**/node_modules",
      "src/test-utils/**",
      "src/__integration__/**", // Integration tests have separate config
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/services/**/*.ts",
        "src/libs/**/*.ts",
        "src/libs/**/*.js",
        "src/api/**/controllers/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "src/test-utils/**"],
    },
    root: ".",
  },
  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },
})
