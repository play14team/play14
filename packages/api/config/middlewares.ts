export default ({ env }: { env: any }) => [
  "strapi::errors",
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
        "^/api/ticket-orders/.+/cancel$", // Ticket cancellation
        "^/api/admin/players/me$", // Profile updates
        "^/api/auth/local$", // Login
        "^/api/auth/local/register$", // Registration
        "^/api/auth/forgot-password$", // Password reset
        "^/api/webhooks/stripe$", // Stripe webhooks (DoS prevention)
        "^/api/connect/.+/callback$", // OAuth callbacks
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
          "style-src": ["'self'", "'unsafe-inline'", "https://cdn.ckeditor.com"],
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
          "frame-src": ["'self'", "https://ckeditor.com", "https://*.ckeditor.com"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      // SECURITY: ALLOWED_ORIGINS must be explicitly configured - no wildcard default.
      // In production, this should be a comma-separated list of specific domains.
      // Example: ALLOWED_ORIGINS=https://play14.org,https://www.play14.org
      // For local development, set ALLOWED_ORIGINS=http://localhost:3000
      origin: env("ALLOWED_ORIGINS")
        ? env("ALLOWED_ORIGINS")
            .split(",")
            .map((o) => o.trim())
        : [], // Empty array = no origins allowed if not configured
      credentials: true,
      maxAge: 3600,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "Origin", "Accept", "X-Requested-With"],
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      includeUnparsed: true,
    },
  },
  {
    name: "strapi::session",
    config: {
      key: "strapi.sid",
      rolling: true, // Enable for proper session lifecycle
      renew: true, // Enable renewal
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  },
  "strapi::favicon",
  "strapi::public",
]
