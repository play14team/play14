/**
 * Test database configuration
 *
 * Uses PostgreSQL test container (play14-db-test) on port 5433 for isolated test runs.
 * Start the test database with: podman-compose up -d play14-db-test
 *
 * This configuration completely replaces the default database.ts config.
 */
export default ({ env }: { env: any }) => ({
  connection: {
    client: "postgres",
    connection: {
      host: env("DATABASE_HOST", "localhost"),
      port: env.int("DATABASE_PORT", 5433),
      database: env("DATABASE_NAME", "play14_test"),
      user: env("DATABASE_USERNAME", "test_user"),
      password: env("DATABASE_PASSWORD", "test_password"),
      schema: env("DATABASE_SCHEMA", "public"),
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    debug: false,
  },
})
