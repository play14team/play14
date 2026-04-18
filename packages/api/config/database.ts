export default ({ env }: { env: any }) => ({
  connection: {
    client: "postgres",
    connection: {
      // Prefer DATABASE_* (used for local dev) but fall back to
      // POSTGRESQL_ADDON_* which Clever Cloud's PostgreSQL add-on auto-injects.
      // Clever Cloud does NOT perform shell-style ${VAR} expansion on env
      // values, so we resolve the fallback here rather than in the env file.
      host: env("DATABASE_HOST") || env("POSTGRESQL_ADDON_HOST", "127.0.0.1"),
      port: env.int("DATABASE_PORT") || env.int("POSTGRESQL_ADDON_PORT", 5432),
      database: env("DATABASE_NAME") || env("POSTGRESQL_ADDON_DB", "strapi"),
      user: env("DATABASE_USERNAME") || env("POSTGRESQL_ADDON_USER", "strapi"),
      password: env("DATABASE_PASSWORD") || env("POSTGRESQL_ADDON_PASSWORD", "strapi"),
      schema: env("DATABASE_SCHEMA", "public"), // Not required
      ssl: env.bool("DATABASE_SSL", true) && {
        rejectUnauthorized: env.bool("DATABASE_SSL_SELF", false),
      },
    },
    pool: {
      min: env.int("DATABASE_POOL_MIN", 5),
      max: env.int("DATABASE_POOL_MAX", 20),
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    },
    debug: env.bool("DATABASE_DEBUG", false),
    acquireConnectionTimeout: 60000,
  },
  settings: {},
})
