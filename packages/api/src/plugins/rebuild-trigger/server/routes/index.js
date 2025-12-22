"use strict";

module.exports = {
  admin: {
    type: "admin",
    routes: [
      {
        method: "POST",
        path: "/trigger",
        handler: "rebuild.trigger",
        config: {
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "GET",
        path: "/status",
        handler: "rebuild.status",
        config: {
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "POST",
        path: "/cancel",
        handler: "rebuild.cancel",
        config: {
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
    ],
  },
};
