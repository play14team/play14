import register from "./register"

// Server entry for the strapi-extended-mcp plugin. Only `register` is exported:
// MCP tools and their admin permissions must be registered during the register
// phase (the MCP HTTP server starts during bootstrap, and registering later
// throws). Strapi's plugin loader resolves this file via the package.json
// `exports["./strapi-server"]` map -> ./dist/server/index.js, so the plugin must
// be built (bun run build:plugins) before Strapi starts.
//
// The `typeof register` annotation keeps the emitted declaration portable —
// without it, tsc can't name the inferred Strapi type in this file (TS2883).
const plugin: { register: typeof register } = {
  register,
}

export default plugin
