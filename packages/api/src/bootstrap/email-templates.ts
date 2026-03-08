import type { Core } from "@strapi/strapi"

interface EmailTemplateOptions {
  from: { name: string; email: string }
  response_email: string
  object: string
  message: string
}

interface EmailTemplates {
  reset_password: { display: string; icon: string; options: EmailTemplateOptions }
  email_confirmation: { display: string; icon: string; options: EmailTemplateOptions }
}

/**
 * Ensure users-permissions email templates use the correct sender and URLs from env vars.
 *
 * Strapi stores these in the database (core_store), so they persist across restarts
 * but may still have Strapi defaults (no-reply@strapi.io) if never configured.
 * This bootstrap step ensures they match the environment configuration.
 */
export async function bootstrapEmailTemplates(strapi: Core.Strapi): Promise<void> {
  const frontendUrl = (process.env.FRONTEND_URL || "https://play14.org").replace(/\/$/, "")
  const defaultFromEmail = process.env.EMAIL_DEFAULT_FROM || "noreply@play14.org"
  const defaultFromName = process.env.EMAIL_DEFAULT_FROM_NAME || "#play14 community"

  const emailStore = strapi.store({
    type: "plugin",
    name: "users-permissions",
    key: "email",
  })

  const advancedStore = strapi.store({
    type: "plugin",
    name: "users-permissions",
    key: "advanced",
  })

  // Fix email_reset_password URL in advanced settings
  const advancedSettings = (await advancedStore.get()) as Record<string, unknown> | null
  if (advancedSettings) {
    const expectedResetUrl = `${frontendUrl}/auth/reset-password`
    if (advancedSettings.email_reset_password !== expectedResetUrl) {
      advancedSettings.email_reset_password = expectedResetUrl
      await advancedStore.set({ value: advancedSettings })
      strapi.log.info(`[Email Templates] Updated reset password URL to: ${expectedResetUrl}`)
    }
  }

  // Fix from address in email templates
  const emailSettings = (await emailStore.get()) as EmailTemplates | null
  if (!emailSettings) return

  let updated = false

  for (const templateKey of ["reset_password", "email_confirmation"] as const) {
    const template = emailSettings[templateKey]
    if (!template?.options?.from) continue

    const { from } = template.options
    if (from.email !== defaultFromEmail || from.name !== defaultFromName) {
      template.options.from = { name: defaultFromName, email: defaultFromEmail }
      updated = true
      strapi.log.info(
        `[Email Templates] Updated ${templateKey} sender to: ${defaultFromName} <${defaultFromEmail}>`
      )
    }
  }

  if (updated) {
    await emailStore.set({ value: emailSettings })
  }
}
