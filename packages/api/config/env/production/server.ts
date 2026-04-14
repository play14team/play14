export default ({ env }: { env: any }) => {
  const publicUrl = env("PUBLIC_URL")
  if (!publicUrl) {
    throw new Error("PUBLIC_URL is required in production")
  }

  return {
    host: env("HOST", "0.0.0.0"),
    port: env.int("PORT", 1337),
    url: publicUrl,

    proxy: {
      koa: true,
    },

    app: {
      keys: env.array("APP_KEYS"),
    },
    cron: {
      enabled: env.bool("CRON_ENABLED", true),
    },
  }
}
