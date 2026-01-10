/**
 * Vitest configuration for integration tests
 *
 * Integration tests run against a real Strapi instance with SQLite database.
 * They test full HTTP request/response cycles and database interactions.
 */

import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__integration__/**/*.integration.test.ts"],
    exclude: ["node_modules"],

    // Integration tests need more time
    testTimeout: 30000,
    hookTimeout: 60000,

    // Run tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Global setup/teardown for Strapi instance
    globalSetup: "./src/__integration__/setup.ts",

    root: ".",

    // Inline Strapi and lodash to handle ESM module resolution issues
    server: {
      deps: {
        inline: [/lodash/, /@strapi/],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },
})
