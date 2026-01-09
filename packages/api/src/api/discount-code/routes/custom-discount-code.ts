/**
 * Custom routes for discount code management
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/events/:eventId/discount-codes",
      handler: "custom-discount-code.createDiscountCode",
      info: { apiName: "discount-code", type: "content-api" },
      config: {
        description: "Create a discount code for an event (host/mentor/founder only)",
      },
    },
    {
      method: "GET",
      path: "/events/:eventId/discount-codes",
      handler: "custom-discount-code.getEventDiscountCodes",
      info: { apiName: "discount-code", type: "content-api" },
      config: {
        description: "Get discount codes for an event (host/mentor/founder only)",
      },
    },
    {
      method: "PUT",
      path: "/discount-codes/:id",
      handler: "custom-discount-code.updateDiscountCode",
      info: { apiName: "discount-code", type: "content-api" },
      config: {
        description: "Update a discount code (host/mentor/founder only)",
      },
    },
    {
      method: "DELETE",
      path: "/discount-codes/:id",
      handler: "custom-discount-code.deleteDiscountCode",
      info: { apiName: "discount-code", type: "content-api" },
      config: {
        description: "Delete a discount code (host/mentor/founder only)",
      },
    },
    {
      method: "POST",
      path: "/events/:eventId/discount-codes/validate",
      handler: "custom-discount-code.validateDiscountCode",
      info: { apiName: "discount-code", type: "content-api" },
      config: {
        auth: false,
        description: "Validate a discount code (public - used during checkout)",
      },
    },
  ],
}
