/**
 * Custom routes for budget line item management
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/events/:eventId/budget-items",
      handler: "custom-budget-line-item.list",
      info: { apiName: "budget-line-item", type: "content-api" },
      config: {
        description: "List budget items for an event (host/mentor/founder only)",
      },
    },
    {
      method: "POST",
      path: "/events/:eventId/budget-items",
      handler: "custom-budget-line-item.create",
      info: { apiName: "budget-line-item", type: "content-api" },
      config: {
        description: "Create a budget item for an event (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/budget-items/:id",
      handler: "custom-budget-line-item.update",
      info: { apiName: "budget-line-item", type: "content-api" },
      config: {
        description: "Update a budget item (host/mentor/founder only)",
      },
    },
    {
      method: "DELETE",
      path: "/budget-items/:id",
      handler: "custom-budget-line-item.delete",
      info: { apiName: "budget-line-item", type: "content-api" },
      config: {
        description: "Delete a budget item (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/events/:eventId/budget-items/bulk",
      handler: "custom-budget-line-item.bulkUpdate",
      info: { apiName: "budget-line-item", type: "content-api" },
      config: {
        description: "Bulk update budget items for an event (host/mentor/founder only)",
      },
    },
  ],
}
