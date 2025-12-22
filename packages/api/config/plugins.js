module.exports = ({ env }) => ({
  "rebuild-trigger": {
    enabled: true,
    resolve: "./src/plugins/rebuild-trigger",
  },
  graphql: {
    config: {
      apolloServer: {
        tracing: false,
        introspection: true,
      },
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
});
