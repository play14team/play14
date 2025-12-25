/**
 * Custom routes for player profile management
 * These routes allow authenticated users to update their own player profile
 */

export default {
  routes: [
    {
      method: "PUT",
      path: "/players/me",
      handler: "custom-player.updateMe",
      config: {
        policies: [],
        middlewares: [],
        description: "Update the current user's player profile",
      },
    },
    {
      method: "GET",
      path: "/players/me",
      handler: "custom-player.findMe",
      config: {
        policies: [],
        middlewares: [],
        description: "Get the current user's player profile",
      },
    },
    {
      method: "POST",
      path: "/players/me/picture",
      handler: "custom-player.uploadPicture",
      config: {
        policies: [],
        middlewares: [],
        description: "Upload a picture for the current user's player profile",
      },
    },
    {
      method: "DELETE",
      path: "/players/me/picture",
      handler: "custom-player.deletePicture",
      config: {
        policies: [],
        middlewares: [],
        description: "Delete the picture for the current user's player profile",
      },
    },
    {
      method: "POST",
      path: "/players/create-for-user",
      handler: "custom-player.createForUser",
      config: {
        policies: [],
        middlewares: [],
        description: "Create a new player profile and link to the current user",
      },
    },
    {
      method: "POST",
      path: "/players/auto-link",
      handler: "custom-player.autoLink",
      config: {
        policies: [],
        middlewares: [],
        description: "Auto-link an existing player to the current user (exact name match)",
      },
    },
  ],
}
