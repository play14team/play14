export default ({ env }: { env: any }) => ({
  connection: {
    client: "postgres",
    connection: {
      host: env("DATABASE_HOST", "127.0.0.1"),
      port: env.int("DATABASE_PORT", 5432),
      database: env("DATABASE_NAME", "strapi"),
      user: env("DATABASE_USERNAME", "strapi"),
      password: env("DATABASE_PASSWORD", "strapi"),
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
