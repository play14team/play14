/**
 * Test environment plugin configuration
 *
 * Overrides default plugin settings for integration tests.
 * Disables plugins that cause issues in test environment.
 */
export default ({ env }: { env: any }) => ({
  // Disable prometheus to avoid metric re-registration errors
  // prom-client's registry persists between test runs causing conflicts
  prometheus: {
    enabled: false,
  },
  // Disable email in tests (already using mock API key)
  email: {
    config: {
      provider: "strapi-provider-email-resend",
      providerOptions: {
        apiKey: env("RESEND_API_KEY", "re_test_mock"),
      },
      settings: {
        defaultFrom: (() => {
          const rawDefaultFrom = env("RESEND_DEFAULT_FROM", "noreply@play14.org")
          return rawDefaultFrom.includes("<")
            ? rawDefaultFrom
            : `#play14 community <${rawDefaultFrom}>`
        })(),
        defaultReplyTo: "community@play14.org",
      },
    },
  },
  // Disable cache in tests to ensure fresh data
  "strapi-cache": {
    enabled: false,
  },
  // Disable Sentry in tests
  sentry: {
    enabled: false,
  },
})
