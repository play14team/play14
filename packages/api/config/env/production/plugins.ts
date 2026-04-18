// Production override: same UPLOAD_PROVIDER env-branching as the base config.
// Default "azure" preserves the current Azure Blob Storage path; set
// UPLOAD_PROVIDER=s3 on Clever Cloud to use Cellar via @strapi/provider-upload-aws-s3.
// CELLAR_ADDON_TLS and CELLAR_FORCE_PATH_STYLE default to Cellar's values
// (TLS on, virtual-hosted-style) — flip both for local MinIO.
export default ({ env }: { env: any }) => ({
  upload:
    env("UPLOAD_PROVIDER", "azure") === "s3"
      ? {
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
        }
      : {
          config: {
            provider: "strapi-provider-upload-azure-storage",
            providerOptions: {
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
})
