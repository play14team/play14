import type { Core } from "@strapi/strapi"

const PLUGIN_NAME = "strapi-extended-mcp"

// One admin RBAC action per tool. The action UID becomes
// plugin::strapi-extended-mcp.<uid>. Add an entry here when you add a tool, then
// gate the tool on the matching MCP_ACTIONS constant.
const ACTION_DEFS = [{ uid: "content-types.read", displayName: "List content types" }] as const

export const MCP_ACTIONS = {
  CONTENT_TYPES_READ: `plugin::${PLUGIN_NAME}.content-types.read`,
} as const

// Shape expected by admin::permission's actionProvider.registerMany for a
// `plugins`-section action — the UID becomes plugin::<pluginName>.<uid>.
type McpAdminAction = {
  section: "plugins"
  pluginName: string
  uid: string
  displayName: string
}

export const registerMcpPermissions = async (strapi: Core.Strapi) => {
  const actions: McpAdminAction[] = ACTION_DEFS.map((a) => ({
    section: "plugins",
    pluginName: PLUGIN_NAME,
    uid: a.uid,
    displayName: a.displayName,
  }))
  await strapi.service("admin::permission").actionProvider.registerMany(actions)
  strapi.log.info(
    `[strapi-extended-mcp plugin] Registered ${ACTION_DEFS.length} custom admin permission(s).`
  )
}
