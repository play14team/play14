import cronTasks from "./cron-tasks"

export default ({ env }: { env: any }) => ({
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
  // Strapi 5 built-in MCP server, served at <strapi-url>/mcp.
  mcp: { enabled: env.bool("MCP_ENABLED", true) },
})
