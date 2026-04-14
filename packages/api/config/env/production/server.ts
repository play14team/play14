export default ({ env }: { env: any }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL"),

  proxy: {
    koa: true,
  },

  app: {
    keys: env.array("APP_KEYS"),
  },
  cron: {
    enabled: env.bool("CRON_ENABLED", true),
  },
})
