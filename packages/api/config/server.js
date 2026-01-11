const cronTasks = require("./cron-tasks")

module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL", ""), // Public URL for OAuth callbacks (e.g., https://api.play14.org)
  app: {
    keys: env.array("APP_KEYS"),
  },
  proxy: env.bool("PROXY", false),
  cron: {
    enabled: env.bool("CRON_ENABLED", true),
    tasks: cronTasks,
  },
})
