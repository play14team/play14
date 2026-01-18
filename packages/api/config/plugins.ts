export default ({ env }: { env: any }) => ({
  email: {
    config: {
      provider: "strapi-provider-email-resend",
      providerOptions: {
        apiKey: env("RESEND_API_KEY"),
      },
      settings: {
        defaultFrom: (() => {
          const rawDefaultFrom = env("RESEND_DEFAULT_FROM", "noreply@play14.org")
          return rawDefaultFrom.includes("<")
            ? rawDefaultFrom
            : `#play14 community <${rawDefaultFrom}>`
        })(),
        defaultReplyTo: env("RESEND_REPLY_TO", "community@play14.org"),
      },
    },
  },
  "rebuild-trigger": {
    enabled: true,
    resolve: "./src/plugins/rebuild-trigger",
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
      // Redis configuration (used when provider is 'redis')
      redisConfig: env("REDIS_URL", "redis://localhost:6379"),
      // Cache settings
      cacheHeaders: true,
      cacheAuthorizedRequests: env.bool("CACHE_AUTHORIZED_REQUESTS", false),
      autoPurgeCache: true,
      cacheGetTimeoutInMs: 1000,
      // Routes to cache (empty array = cache all /api routes)
      cacheableRoutes: [
        "/api/articles",
        "/api/events",
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
  sentry: {
    enabled: true,
    config: {
      dsn: env("NODE_ENV") === "production" ? env("SENTRY_DSN") : null,
      sendMetadata: true,
    },
  },
  prometheus: {
    enabled: env.bool("METRICS_ENABLED", true),
    config: {
      collectDefaultMetrics: { prefix: "" },
      labels: {
        app: "play14-api",
        environment: env("NODE_ENV", "development"),
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
  // upload: {
  //   config: {
  //     provider: 'strapi-provider-upload-local-url',
  //     providerOptions: {
  //       baseurl: "http://localhost:1337"
  //     }
  //   }
  // },
  upload: {
    config: {
      provider: "strapi-provider-upload-azure-storage",
      providerOptions: {
        authType: "default",
        account: env("STORAGE_ACCOUNT"),
        accountKey: env("STORAGE_ACCOUNT_KEY"),
        serviceBaseURL: env("STORAGE_URL"),
        containerName: env("STORAGE_CONTAINER_NAME", "strapi_uploads"),
        cdnBaseURL: env("STORAGE_CDN_URL"),
        defaultPath: "assets",
        maxConcurrent: 10,
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
              publishedAt: { $notNull: true },
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
