/**
 * Test database configuration
 *
 * Uses the ephemeral PostgreSQL test container (play14-db-test), published on
 * host port 5433 by default. Start it with:
 *   podman-compose up -d play14-db-test
 * (or let `bun run test:integration` do it via its pretest hook).
 *
 * This configuration completely replaces the default database.ts config.
 *
 * The keys are TEST_DATABASE_* rather than DATABASE_*: Strapi loads .env for
 * every environment, so reading DATABASE_* here would let the development
 * credentials in packages/api/.env point an integration run at the real
 * development database. Remap the host port with PLAY14_DB_TEST_PORT in the
 * root .env and mirror it here as TEST_DATABASE_PORT.
 */
export default ({ env }: { env: any }) => ({
  connection: {
    client: "postgres",
    connection: {
      host: env("TEST_DATABASE_HOST", "localhost"),
      port: env.int("TEST_DATABASE_PORT", 5433),
      database: env("TEST_DATABASE_NAME", "play14_test"),
      user: env("TEST_DATABASE_USERNAME", "test_user"),
      password: env("TEST_DATABASE_PASSWORD", "test_password"),
      schema: env("TEST_DATABASE_SCHEMA", "public"),
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    debug: false,
  },
})
