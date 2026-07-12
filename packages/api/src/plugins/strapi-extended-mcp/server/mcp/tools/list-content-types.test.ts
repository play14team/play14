import { describe, expect, it } from "vitest"
import { MCP_ACTIONS } from "../permissions"
import tool from "./list-content-types"

// Capture the definition the plugin hands to registerTool so we can exercise
// the RBAC gating and the handler without a running Strapi.
const captured: any[] = []
tool.register(((def: any) => captured.push(def)) as any, {} as any)
const def = captured[0]

describe("strapi-extended-mcp: list_content_types", () => {
  it("registers a single tool named list_content_types", () => {
    expect(captured).toHaveLength(1)
    expect(def.name).toBe("list_content_types")
  })

  it("is gated on the plugin-namespaced admin RBAC action", () => {
    expect(MCP_ACTIONS.CONTENT_TYPES_READ).toBe("plugin::strapi-extended-mcp.content-types.read")
    expect(def.auth.policies).toEqual([
      { action: "plugin::strapi-extended-mcp.content-types.read" },
    ])
  })

  it("returns only api:: content types, with uid + kind (defaulting kind)", async () => {
    const fakeStrapi = {
      contentTypes: {
        "api::event.event": { kind: "collectionType" },
        "api::home.home": { kind: "singleType" },
        "api::tag.tag": {}, // missing kind -> defaults to collectionType
        "admin::user": { kind: "collectionType" }, // filtered out (not api::)
        "plugin::upload.file": { kind: "collectionType" }, // filtered out
      },
    }

    const handler = def.createHandler(fakeStrapi)
    const res = await handler()

    expect(res.structuredContent.count).toBe(3)
    const byUid = Object.fromEntries(
      res.structuredContent.contentTypes.map((c: { uid: string; kind: string }) => [c.uid, c.kind])
    )
    expect(byUid).toEqual({
      "api::event.event": "collectionType",
      "api::home.home": "singleType",
      "api::tag.tag": "collectionType",
    })
    // The text content block mirrors the structured payload.
    expect(JSON.parse(res.content[0].text)).toEqual(res.structuredContent)
  })
})
