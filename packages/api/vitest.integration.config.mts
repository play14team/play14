/**
 * Vitest configuration for integration tests
 *
 * Integration tests run against a real Strapi instance with PostgreSQL database.
 * They test full HTTP request/response cycles and database interactions.
 *
 * Prerequisites:
 * - PostgreSQL test database running: podman-compose up -d play14-db-test
 */

import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__integration__/**/*.integration.test.ts"],
    exclude: ["node_modules"],

    // Integration tests need more time
    testTimeout: 30000,
    hookTimeout: 60000,

    // Run all tests in a single thread to ensure:
    // 1. Only one Strapi instance is created (Strapi can't be loaded twice)
    // 2. Module singletons (mock payment state) are shared between checkout and webhook
    pool: "threads",
    maxWorkers: 1,
    isolate: false,

    // Run test files sequentially
    fileParallelism: false,

    // Global setup/teardown for Strapi instance
    globalSetup: "./src/__integration__/setup.ts",

    root: ".",

    // Inline dependencies to ensure module singletons are shared correctly
    // This prevents vitest from creating separate module instances for payment provider
    server: {
      deps: {
        inline: [/lodash/, /@strapi/, /services\/payment/],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },
})
