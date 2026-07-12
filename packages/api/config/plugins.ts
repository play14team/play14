export default ({ env }: { env: any }) => ({
  email: {
    config: {
      provider: require.resolve("strapi-provider-email-sender"),
      providerOptions: {
        apiKey: env("SENDER_API_KEY"),
      },
      settings: {
        defaultFrom: (() => {
          const rawDefaultFrom = env("EMAIL_DEFAULT_FROM", "noreply@play14.org")
          return rawDefaultFrom.includes("<")
            ? rawDefaultFrom
            : `#play14 community <${rawDefaultFrom}>`
        })(),
        defaultReplyTo: env("EMAIL_REPLY_TO", "community@play14.org"),
      },
    },
  },
  "rebuild-trigger": {
    enabled: true,
    resolve: "./src/plugins/rebuild-trigger",
  },
  // Local plugin: custom MCP tools gated by admin RBAC. Built to its own dist/
  // by `bun run build:plugins` (wired into build + dev) — Strapi's loader needs
  // the compiled ./dist/server/index.js referenced by the plugin's package.json
  // `exports`, not the .ts source.
  "strapi-extended-mcp": {
    // Opt-in in production; on by default elsewhere (mirrors config/server.ts).
    enabled: env.bool("MCP_ENABLED", env("NODE_ENV") !== "production"),
    resolve: "./src/plugins/strapi-extended-mcp",
  },
  "strapi-cache": {
    enabled: env.bool("CACHE_ENABLED", true),
    config: {
      debug: env.bool("CACHE_DEBUG", false),
      provider: env("CACHE_PROVIDER", "memory"),
      // Memory cache settings
      max: env.int("CACHE_MAX_ITEMS", 1000),
      maxSize: env.int("CACHE_MAX_SIZE", 1024 * 1024 * 1024), // 1GB default
      ttl: env.int("CACHE_TTL", 1000 * 60 * 60), // 1 hour default
      allowStale: false,
      // Redis configuration (only used when provider is 'redis')
      // No default - Redis is optional and only used if REDIS_URL is set
      redisConfig: env("REDIS_URL") || undefined,
      // Cache settings
      cacheHeaders: true,
      cacheAuthorizedRequests: env.bool("CACHE_AUTHORIZED_REQUESTS", false),
      autoPurgeCache: true,
      cacheGetTimeoutInMs: 1000,
      // Routes to cache (empty array = cache all /api routes)
      cacheableRoutes: [
        "/api/articles",
        "/api/event-locations",
        "/api/expectations",
        "/api/format",
        "/api/games",
        "/api/history",
        "/api/home",
        "/api/hosting",
        "/api/players",
        "/api/sponsors",
        "/api/tags",
        "/api/testimonials",
        "/api/venues",
      ],
      // Routes to exclude from caching
      excludeRoutes: [
        "/api/admin",
        "/api/auth",
        "/api/events",
        "/api/users-permissions",
        "/api/users",
        "/api/attendance-claims",
        "/api/player-claims",
        "/api/budget-line-items",
        "/api/result-line-items",
        "/api/upload",
        "/api/events/my-events",
        "/api/players/list",
        "/api/ticket-orders",
        "/api/tickets",
        "/api/fuzzy-search",
      ],
    },
  },
  prometheus: {
    enabled: env.bool("METRICS_ENABLED", true),
    config: {
      collectDefaultMetrics: { prefix: "" },
      labels: {
        app: "play14-api",
        environment: env("NODE_ENV", "development"),
        // Clever Cloud auto-injects APP_ID; the Grafana dashboards filter
        // on {app_id=~"$APP_ID"}, so every scraped series must carry it.
        app_id: env("APP_ID", "play14-api"),
      },
      server: env.bool("METRICS_SEPARATE_SERVER", true)
        ? {
            port: env.int("METRICS_PORT", 9000),
            host: env("METRICS_HOST", "0.0.0.0"),
            path: env("METRICS_PATH", "/metrics"),
          }
        : false,
      normalize: [
        [/\/(?:[a-z0-9]{24,25}|\d+)(?=\/|$)/i, "/:id"],
        [/\/uploads\/[^/]+\.[a-z0-9]+/i, "/uploads/:file"],
        [/(events|players|games|articles|venues)\/[a-z0-9-]+/i, "$1/:slug"],
      ],
    },
  },
  ckeditor5: {
    enabled: true,
  },
  // Clever Cloud Cellar (S3-compatible) via @strapi/provider-upload-aws-s3.
  // CELLAR_ADDON_TLS and CELLAR_FORCE_PATH_STYLE let the same config target
  // a local MinIO (plain HTTP + path-style) without changing production.
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env("CELLAR_ADDON_KEY_ID"),
            secretAccessKey: env("CELLAR_ADDON_KEY_SECRET"),
          },
          endpoint: `${env.bool("CELLAR_ADDON_TLS", true) ? "https" : "http"}://${env("CELLAR_ADDON_HOST")}`,
          // Cellar ignores region but the SDK requires one.
          region: env("CELLAR_REGION", "us-east-1"),
          params: { Bucket: env("CELLAR_BUCKET") },
          // Cellar uses virtual-hosted-style URLs; MinIO wants path-style.
          forcePathStyle: env.bool("CELLAR_FORCE_PATH_STYLE", false),
        },
        baseUrl: env("STORAGE_CDN_URL"),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  "map-field": {
    enabled: true,
  },
  "timezone-select": {
    enabled: true,
  },
  "country-select": {
    enabled: true,
  },
  "multi-select": {
    enabled: true,
  },
  "webp-converter": {
    enabled: true,
    config: {
      mimeTypes: undefined, // Defaults to image/png, image/jpeg, image/jpg
      options: {},
    },
  },
  "strapi-ai-translator": {
    enabled: true,
  },
  "fuzzy-search": {
    enabled: true,
    config: {
      contentTypes: [
        {
          uid: "api::event.event",
          modelName: "event",
          queryConstraints: {
            where: {
              $and: [
                {
                  publishedAt: { $notNull: true },
                },
              ],
            },
          },
          fuzzysortOptions: {
            characterLimit: 100,
            threshold: 0,
            keys: [
              {
                name: "name",
                weight: 1000,
              },
            ],
          },
        },
        {
          uid: "api::player.player",
          modelName: "player",
          queryConstraints: {
            where: {
              $and: [{ publishedAt: { $notNull: true } }, { visible: { $ne: false } }],
            },
          },
          fuzzysortOptions: {
            characterLimit: 100,
            threshold: 0,
            keys: [
              {
                name: "name",
                weight: 5000,
              },
              {
                name: "slug",
                weight: 3000,
              },
              {
                name: "company",
                weight: 100,
              },
            ],
          },
        },
        {
          uid: "api::game.game",
          modelName: "game",
          queryConstraints: {
            where: {
              publishedAt: { $notNull: true },
            },
          },
          fuzzysortOptions: {
            characterLimit: 100,
            threshold: 0,
            keys: [
              {
                name: "name",
                weight: 1000,
              },
              {
                name: "slug",
                weight: 500,
              },
            ],
          },
        },
        {
          uid: "api::article.article",
          modelName: "article",
          queryConstraints: {
            where: {
              publishedAt: { $notNull: true },
            },
          },
          fuzzysortOptions: {
            characterLimit: 100,
            threshold: 0,
            keys: [
              {
                name: "title",
                weight: 1000,
              },
              {
                name: "slug",
                weight: 500,
              },
            ],
          },
        },
      ],
    },
  },
})
