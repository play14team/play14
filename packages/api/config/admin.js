module.exports = ({ env }) => ({
  auth: {
    secret: env("ADMIN_JWT_SECRET"),
    // Session-based auth configuration (Strapi 5+)
    sessions: {
      maxRefreshTokenLifespan: 1000 * 60 * 60 * 24 * 30, // 30 days in ms
      maxSessionLifespan: 1000 * 60 * 60 * 24 * 7, // 7 days in ms
    },
  },
  apiToken: {
    salt: env("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: env("TRANSFER_TOKEN_SALT"),
    },
  },
  forgotPassword: {
    from: "admin@play14.org",
    replyTo: "admin@play14.org",
  },
  watchIgnoreFiles: [
    "**/config/sync/**",
    "CLAUDE.md",
    "Dockerfile*",
    "*compose*.yaml",
    "README.md",
    "LICENSE",
    ".gitignore",
    ".dockerignore",
  ],
})
