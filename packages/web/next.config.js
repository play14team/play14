/** @type {import('next').NextConfig} */

const createNextIntlPlugin = require("next-intl/plugin")
const path = require("node:path")

const withNextIntl = createNextIntlPlugin()

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
      // Clever Cloud Cellar direct origin (covers any bucket under cellar-c2).
      // cdn.play14.org pattern above already handles the Cloudflare-fronted CDN URLs.
      {
        protocol: "https",
        hostname: "*.cellar-c2.services.clever-cloud.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/vi/**",
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

module.exports = withNextIntl(nextConfig)
