// Production override for upload: Clever Cloud Cellar (S3-compatible) via
// @strapi/provider-upload-aws-s3. CELLAR_ADDON_TLS and CELLAR_FORCE_PATH_STYLE
// default to Cellar's values (TLS on, virtual-hosted-style).
export default ({ env }: { env: any }) => ({
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
          region: env("CELLAR_REGION", "us-east-1"),
          params: { Bucket: env("CELLAR_BUCKET") },
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
})
