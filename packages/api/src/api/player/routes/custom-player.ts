/**
 * Custom routes for player profile management
 * These routes allow authenticated users to update their own player profile
 */

export default {
  routes: [
    {
      method: "PUT",
      path: "/admin/players/me",
      handler: "custom-player.updateMe",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update the current user's player profile",
      },
    },
    {
      method: "GET",
      path: "/admin/players/me",
      handler: "custom-player.findMe",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get the current user's player profile",
      },
    },
    {
      method: "POST",
      path: "/admin/players/me/picture",
      handler: "custom-player.uploadPicture",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload a picture for the current user's player profile",
      },
    },
    {
      method: "DELETE",
      path: "/admin/players/me/picture",
      handler: "custom-player.deletePicture",
      info: { apiName: "player", type: "content-api" },
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
      info: { apiName: "player", type: "content-api" },
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
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Auto-link an existing player to the current user (exact name match)",
      },
    },
    {
      method: "PUT",
      path: "/admin/players/:id/position",
      handler: "custom-player.updatePlayerPosition",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description:
          "Update a player's position (Host/Mentor/Founder only, with hierarchical permissions)",
      },
    },
    {
      method: "GET",
      path: "/admin/players/list",
      handler: "custom-player.listPlayers",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "List all players with optional letter filter (organizers only)",
      },
    },
    {
      method: "GET",
      path: "/admin/players/:id/edit",
      handler: "custom-player.getPlayerForEdit",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get a player for editing (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/players/:id",
      handler: "custom-player.updatePlayer",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Update another player's profile (organizers only)",
      },
    },
    {
      method: "PUT",
      path: "/admin/players/:id/avatar/library",
      handler: "custom-player.setAvatarFromLibrary",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Set a player's avatar from the media library (organizers only)",
      },
    },
    {
      method: "DELETE",
      path: "/admin/players/:id/avatar",
      handler: "custom-player.removeAvatar",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Remove a player's avatar (organizers only)",
      },
    },
    {
      method: "POST",
      path: "/admin/players/:id/avatar/upload",
      handler: "custom-player.uploadAvatarForPlayer",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload an avatar for a player (organizers only)",
      },
    },
    {
      method: "GET",
      path: "/admin/players/me/attended-events",
      handler: "custom-player.getMyAttendedEvents",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Get events the current user has attended (via tickets or approved claims)",
      },
    },
    {
      method: "POST",
      path: "/admin/players/:id/send-invite",
      handler: "custom-player.sendSingleInvite",
      info: { apiName: "player", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Send invitation email to a player (organizers only)",
      },
    },
  ],
}
