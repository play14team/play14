/**
 * Test database configuration
 *
 * Uses SQLite for fast, isolated test runs.
 * The test database file is created in .tmp/test.db
 *
 * Note: We explicitly don't set a schema as SQLite doesn't support schemas.
 * This configuration completely replaces the default database.js config.
 */
module.exports = ({ env }) => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: env("DATABASE_FILENAME", ".tmp/test.db"),
    },
    useNullAsDefault: true,
    debug: false,
    pool: {
      min: 1,
      max: 1,
    },
  },
})
