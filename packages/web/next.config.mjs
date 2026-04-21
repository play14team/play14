/** @type {import('next').NextConfig} */

import path from "node:path"
import { fileURLToPath } from "node:url"
import createNextIntlPlugin from "next-intl/plugin"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const withNextIntl = createNextIntlPlugin()

const isProduction = process.env.NODE_ENV === "production"

/**
 * Build the Content-Security-Policy value.
 *
 * This is emitted under `Content-Security-Policy-Report-Only` so violations are
 * logged to the browser console (and any future report endpoint) without
 * blocking requests. Plan: monitor for ~1 week, then flip the header key to
 * `Content-Security-Policy` to enforce. Tightening (nonces / strict-dynamic,
 * dropping `'unsafe-inline'`) is a separate follow-up.
 *
 * Origins included per integration:
 *  - Stripe Connect checkout  -> js.stripe.com, checkout.stripe.com, api.stripe.com
 *  - Mapbox GL + Geocoder     -> api.mapbox.com, events.mapbox.com, *.tiles.mapbox.com
 *  - Cloudflare Turnstile     -> challenges.cloudflare.com
 *  - Strapi CMS REST API      -> api.play14.org, api-staging.play14.org
 *  - Cellar / CDN assets      -> cdn.play14.org, *.cellar-c2.services.clever-cloud.com
 *  - YouTube embeds/thumbs    -> www.youtube.com, www.youtube-nocookie.com, img.youtube.com, i.ytimg.com
 *  - Dev only                 -> http(s)://localhost:*, ws://localhost:* for Turbopack HMR
 */
function buildContentSecurityPolicy() {
  const stripeScript = "https://js.stripe.com"
  const stripeFrame = [
    "https://js.stripe.com",
    "https://checkout.stripe.com",
    "https://hooks.stripe.com",
  ]
  const stripeConnect = ["https://api.stripe.com", "https://checkout.stripe.com"]
  const stripeForm = "https://checkout.stripe.com"

  const mapboxScript = "https://api.mapbox.com"
  const mapboxConnect = [
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://*.tiles.mapbox.com",
  ]
  const mapboxImg = ["https://api.mapbox.com", "https://*.tiles.mapbox.com"]

  const turnstile = "https://challenges.cloudflare.com"

  const strapiApis = ["https://api.play14.org", "https://api-staging.play14.org"]

  const cellar = [
    "https://cdn.play14.org",
    "https://cdn-staging.play14.org",
    "https://*.cellar-c2.services.clever-cloud.com",
  ]

  const youtubeFrame = ["https://www.youtube.com", "https://www.youtube-nocookie.com"]
  const youtubeImg = ["https://img.youtube.com", "https://i.ytimg.com"]

  // Local dev needs Turbopack HMR (eval + websocket) and localhost asset/API access.
  const devScript = isProduction ? [] : ["'unsafe-eval'"]
  const devConnect = isProduction
    ? []
    : ["http://localhost:*", "https://localhost:*", "ws://localhost:*", "wss://localhost:*"]
  const devImg = isProduction ? [] : ["http://localhost:*"]

  const directives = {
    "default-src": ["'self'"],
    // 'unsafe-inline' stays until we migrate Next.js bootstrap scripts to nonces (follow-up).
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      stripeScript,
      turnstile,
      mapboxScript,
      ...devScript,
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...cellar, ...mapboxImg, ...youtubeImg, ...devImg],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...strapiApis,
      ...mapboxConnect,
      ...stripeConnect,
      turnstile,
      ...devConnect,
    ],
    "frame-src": ["'self'", ...stripeFrame, turnstile, ...youtubeFrame],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", stripeForm],
    // Stricter than X-Frame-Options; keep both for older browsers.
    "frame-ancestors": ["'none'"],
  }

  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`)
  if (isProduction) {
    parts.push("upgrade-insecure-requests")
  }
  return parts.join("; ")
}

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), usb=(), magnetometer=(), gyroscope=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // HSTS is only meaningful over HTTPS; avoid pinning localhost to HTTPS during development.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
  // Report-Only for now — monitor browser violations for ~1 week, then flip to
  // `Content-Security-Policy` to enforce. Do NOT enable enforcement in this pass.
  {
    key: "Content-Security-Policy-Report-Only",
    value: buildContentSecurityPolicy(),
  },
]

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
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
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.play14.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-staging.play14.org",
        port: "",
        pathname: "/**",
      },
      // Clever Cloud Cellar direct origin (covers any bucket under cellar-c2).
      // The cdn(-staging).play14.org patterns above already handle the Cloudflare-fronted CDN URLs.
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
        protocol: "http",
        hostname: "localhost",
        port: "9100",
        pathname: "/play14-uploads/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        port: "",
        pathname: "/vi/**",
      },
    ],
    // AVIF encoding is ~3–5× the transient RSS of WebP and dominated the
    // web tier's peak memory on the XS flavor. The bandwidth win over WebP
    // is ~10–20%, which is not worth the OOM risk or the CPU spent on a
    // stateless Next.js box whose image cache is wiped on every deploy.
    // Stick to WebP only; revisit if we move image optimization off-app.
    formats: ["image/webp"],
    // Dropped 3840 (4K) — near-zero real traffic, highest encode cost.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Dropped 16/32/48 — no <Image> usage below 64px in the codebase.
    imageSizes: [64, 96, 128, 200, 256, 384, 800],
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
}

export default withNextIntl(nextConfig)
