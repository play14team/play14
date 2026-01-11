/** @type {import('next').NextConfig} */

const { withSentryConfig } = require("@sentry/nextjs")
const path = require("path")

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
