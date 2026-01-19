/** @type {import('next').NextConfig} */

const { withSentryConfig } = require("@sentry/nextjs")
const path = require("node:path")

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Explicitly define environment variables to ensure they're inlined in client bundles
  // This fixes an issue in Next.js 15.3+ where NEXT_PUBLIC_* vars aren't properly embedded
  // in standalone builds with client components
  // See: https://github.com/vercel/next.js/issues/80194
  env: {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_WEB_VITALS: process.env.NEXT_PUBLIC_WEB_VITALS,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.play14.org",
        port: "",
        pathname: "/strapi-uploads/assets/**",
      },
      {
        protocol: "https",
        hostname: "play14-cdn.azureedge.net",
        port: "",
        pathname: "/strapi-uploads/assets/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 384, 800],
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
}

// Sentry configuration for source map uploads and build-time options
const sentryConfig = {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  webpack: {
    treeshake: {
      removeDebugLogging: true, // replaces disableLogger
    },
    automaticVercelMonitors: true, // moved under webpack
  },
}

// Only wrap with Sentry if DSN is configured
module.exports = process.env.SENTRY_DSN ? withSentryConfig(nextConfig, sentryConfig) : nextConfig
