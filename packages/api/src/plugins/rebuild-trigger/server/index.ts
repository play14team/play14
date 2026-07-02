/// <reference types="@strapi/strapi" />
import controllers from "./controllers"
import routes from "./routes"

// Server entry, resolved via package.json `exports["./strapi-server"]` ->
// ./dist/server/index.js. Built by `bun run build:plugins`; Strapi's loader
// needs the compiled .js, not this .ts source.
export default {
  controllers,
  routes,
}
