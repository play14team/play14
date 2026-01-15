/**
 * Custom routes for result line item management
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/events/:eventId/result-items",
      handler: "custom-result-line-item.list",
      info: { apiName: "result-line-item", type: "content-api" },
      config: {
        description: "List result items for an event (host/mentor/founder only)",
      },
    },
    {
      method: "POST",
      path: "/events/:eventId/result-items",
      handler: "custom-result-line-item.create",
      info: { apiName: "result-line-item", type: "content-api" },
      config: {
        description: "Create a result item for an event (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/result-items/:id",
      handler: "custom-result-line-item.update",
      info: { apiName: "result-line-item", type: "content-api" },
      config: {
        description: "Update a result item (host/mentor/founder only)",
      },
    },
    {
      method: "DELETE",
      path: "/result-items/:id",
      handler: "custom-result-line-item.delete",
      info: { apiName: "result-line-item", type: "content-api" },
      config: {
        description: "Delete a result item (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:eventId/result-items/bulk",
      handler: "custom-result-line-item.bulkUpdate",
      info: { apiName: "result-line-item", type: "content-api" },
      config: {
        description: "Bulk update result items for an event (host/mentor/founder only)",
      },
    },
  ],
}
