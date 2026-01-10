module.exports = ({ env }) => [
  "strapi::errors",
  // Prometheus metrics middleware (early for accurate timing)
  {
    name: "global::metrics",
    config: {
      enabled: env.bool("METRICS_ENABLED", true),
    },
  },
  // Sentry middleware for error tracking and APM
  {
    name: "global::sentry",
    config: {
      enabled: env.bool("SENTRY_ENABLED", true),
    },
  },
  // Rate limiting for critical API endpoints
  {
    name: "global::rate-limit",
    config: {
      max: parseInt(env("RATE_LIMIT_MAX", "30"), 10),
      windowMs: parseInt(env("RATE_LIMIT_WINDOW_MS", "60000"), 10), // 1 minute
      message: "Too many requests, please try again later.",
      // Only apply rate limiting to these critical paths
      onlyPaths: [
        "^/api/ticket-orders$", // Ticket purchase initiation
        "^/api/ticket-orders/initiate-checkout$",
        "^/api/ticket-orders/initiate-free-checkout$",
        "^/api/players/me$", // Profile updates
        "^/api/auth/local$", // Login
        "^/api/auth/local/register$", // Registration
        "^/api/auth/forgot-password$", // Password reset
      ],
    },
  },
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": [
            "'self'",
            "https:",
            "blob:",
            "*.strapi.io",
            "https://proxy-event.ckeditor.com",
            "https://cdn.ckeditor.com",
          ],
          "script-src": [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "cdn.jsdelivr.net",
            "api.mapbox.com",
            "https://cdn.ckeditor.com",
          ],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "cdn.jsdelivr.net",
            "dl.airtable.com",
            "*.strapi.io",
            "s3.amazonaws.com",
            "https://cdn.ckeditor.com",
            process.env.STORAGE_URL,
            process.env.STORAGE_CDN_URL,
          ],
          "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://cdn.ckeditor.com",
          ],
          "font-src": ["'self'", "https://cdn.ckeditor.com"],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "dl.airtable.com",
            process.env.STORAGE_URL,
            process.env.STORAGE_CDN_URL,
          ],
          "worker-src": ["'self'", "blob:"],
          "frame-src": [
            "'self'",
            "https://ckeditor.com",
            "https://*.ckeditor.com",
          ],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      includeUnparsed: true,
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
