import { randomBytes } from "node:crypto"
import { render } from "@react-email/render"
import type { Core } from "@strapi/strapi"
import UserInvitationEmail from "../emails/user-invitation"

interface InvitationUser {
  id: number
  documentId: string
  email: string
  username: string
  invitationStatus?: string
  invitationSentAt?: string
  invitationReminderSentAt?: string
  player?: { name?: string }
}

const DEFAULT_INVITE_LIMIT = 50
const DEFAULT_REMINDER_DAYS = 7
const DEFAULT_INVITE_DELAY_MS = 600
const DEFAULT_INVITE_MAX_RETRIES = 3
const DEFAULT_INVITE_RETRY_DELAY_MS = 1000
const DEFAULT_INVITE_CALLBACK_URL = "/admin"

function buildInviteUrl(resetToken: string): string {
  const frontendUrl = (process.env.FRONTEND_URL || "https://play14.org").replace(/\/$/, "")
  const callbackUrl = encodeURIComponent(
    process.env.INVITATION_CALLBACK_URL || DEFAULT_INVITE_CALLBACK_URL
  )
  const code = encodeURIComponent(resetToken)
  return `${frontendUrl}/auth/reset-password?code=${code}&callbackUrl=${callbackUrl}`
}

function createResetPasswordToken(): string {
  return randomBytes(64).toString("hex")
}

async function buildEmailPayload(user: InvitationUser, reminder: boolean, resetToken: string) {
  const inviteUrl = buildInviteUrl(resetToken)
  const html = await render(
    UserInvitationEmail({
      name: user.player?.name || user.username,
      inviteUrl,
      reminder,
    })
  )
  const text = await render(
    UserInvitationEmail({
      name: user.player?.name || user.username,
      inviteUrl,
      reminder,
    }),
    { plainText: true }
  )
  const subject = reminder ? "Reminder: your #play14 account is ready" : "You're invited to #play14"

  return { html, text, subject }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function reportInvitationError(
  strapi: Core.Strapi,
  user: InvitationUser,
  reminder: boolean,
  error: unknown
) {
  const errorMessage = formatErrorMessage(error)
  const action = reminder ? "reminder" : "invite"

  strapi.log.error(
    `[Invitations] Failed to send ${action} to ${user.email}: ${errorMessage}`,
    error
  )

  const sentryConfig = strapi.config.get("plugin::sentry") as { dsn?: string | null }
  if (!sentryConfig?.dsn) {
    return
  }

  const sentryService = strapi.plugin("sentry")?.service("sentry")
  if (!sentryService) {
    return
  }

  sentryService.sendError(error, (scope: any) => {
    scope.setTag("module", "user-invitations")
    scope.setContext("invitation", {
      action,
      userId: user.documentId,
      email: user.email,
    })
  })
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined
  }

  const statusCode = (error as { statusCode?: number }).statusCode
  if (typeof statusCode === "number") {
    return statusCode
  }

  const responseStatus = (error as { response?: { status?: number } }).response?.status
  if (typeof responseStatus === "number") {
    return responseStatus
  }

  return undefined
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  return (
    getErrorStatusCode(error) === 429 || (error as { name?: string }).name === "rate_limit_exceeded"
  )
}

async function sleep(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

function createRateLimiter(delayMs: number): () => Promise<void> {
  let lastSentAt = 0

  return async () => {
    if (delayMs <= 0) {
      lastSentAt = Date.now()
      return
    }

    const now = Date.now()
    const waitMs = Math.max(0, delayMs - (now - lastSentAt))
    await sleep(waitMs)
    lastSentAt = Date.now()
  }
}

async function sendWithRateLimit(
  strapi: Core.Strapi,
  user: InvitationUser,
  reminder: boolean,
  resetToken: string,
  rateLimiter: () => Promise<void>,
  maxRetries: number,
  retryDelayMs: number
): Promise<void> {
  let attempt = 0

  while (true) {
    await rateLimiter()

    try {
      await sendInvitationEmail(strapi, user, reminder, resetToken)
      return
    } catch (error) {
      if (isRateLimitError(error) && attempt < maxRetries) {
        const backoffMs = retryDelayMs * 2 ** attempt
        strapi.log.warn(
          `[Invitations] Rate limited sending ${reminder ? "reminder" : "invite"} to ${user.email}. ` +
            `Retrying in ${backoffMs}ms.`
        )
        attempt += 1
        await sleep(backoffMs)
        continue
      }

      throw error
    }
  }
}

async function sendInvitationEmail(
  strapi: Core.Strapi,
  user: InvitationUser,
  reminder: boolean,
  resetToken: string
) {
  const payload = await buildEmailPayload(user, reminder, resetToken)
  await strapi.plugin("email").service("email").send({
    to: user.email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })
}

/**
 * Send an invitation email to a user and update their invitation status.
 * This is the primary function for sending user invitations from any context
 * (import, manual trigger, etc.)
 *
 * @returns true if email was sent successfully, false otherwise
 */
export async function sendUserInvitationAndUpdateStatus(
  strapi: Core.Strapi,
  user: {
    documentId: string
    email: string
    username: string
    player?: { name?: string }
  }
): Promise<boolean> {
  try {
    const resetToken = createResetPasswordToken()

    // Update user with reset token
    await strapi.documents("plugin::users-permissions.user").update({
      documentId: user.documentId,
      data: { resetPasswordToken: resetToken } as any,
    })

    // Build and send email
    const inviteUrl = buildInviteUrl(resetToken)
    const html = await render(
      UserInvitationEmail({
        name: user.player?.name || user.username,
        inviteUrl,
        reminder: false,
      })
    )
    const text = await render(
      UserInvitationEmail({
        name: user.player?.name || user.username,
        inviteUrl,
        reminder: false,
      }),
      { plainText: true }
    )

    await strapi.plugin("email").service("email").send({
      to: user.email,
      subject: "You're invited to #play14",
      html,
      text,
    })

    // Update invitation status to sent
    await strapi.documents("plugin::users-permissions.user").update({
      documentId: user.documentId,
      data: {
        invitationStatus: "sent",
        invitationSentAt: new Date().toISOString(),
      } as any,
    })

    strapi.log.info(`[Invitations] Sent invite to ${user.email}`)
    return true
  } catch (error) {
    // Log error but don't throw - caller can decide to retry via cron
    const errorMessage = formatErrorMessage(error)
    strapi.log.error(`[Invitations] Failed to send invite to ${user.email}: ${errorMessage}`)
    return false
  }
}

/**
 * Atomically claim a user for processing using conditional UPDATE.
 * This prevents duplicate processing in multi-container deployments.
 * Returns true if this container successfully claimed the user.
 */
async function claimUserForProcessing(
  strapi: Core.Strapi,
  userDocumentId: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  const knex = strapi.db.connection
  const result = await knex("up_users")
    .where("document_id", userDocumentId)
    .where("invitation_status", fromStatus)
    .update({
      invitation_status: toStatus,
      updated_at: new Date(),
    })

  return result > 0
}

/**
 * Revert a user's invitation status after a failed processing attempt.
 * This allows the cron job to retry on the next run.
 */
async function revertUserStatus(
  strapi: Core.Strapi,
  userDocumentId: string,
  toStatus: string
): Promise<void> {
  const knex = strapi.db.connection
  await knex("up_users").where("document_id", userDocumentId).update({
    invitation_status: toStatus,
    updated_at: new Date(),
  })
}

export async function processUserInvitations(strapi: Core.Strapi): Promise<void> {
  if (process.env.INVITATION_EMAILS_ENABLED === "false") {
    return
  }

  const limit = Number(process.env.INVITATION_SEND_LIMIT || DEFAULT_INVITE_LIMIT)
  const reminderDays = Number(process.env.INVITATION_REMINDER_DAYS || DEFAULT_REMINDER_DAYS)
  const sendDelayMs = Number(process.env.INVITATION_SEND_DELAY_MS || DEFAULT_INVITE_DELAY_MS)
  const maxRetries = Number(process.env.INVITATION_SEND_MAX_RETRIES || DEFAULT_INVITE_MAX_RETRIES)
  const retryDelayMs = Number(
    process.env.INVITATION_SEND_RETRY_DELAY_MS || DEFAULT_INVITE_RETRY_DELAY_MS
  )
  const reminderThreshold = new Date(Date.now() - reminderDays * 24 * 60 * 60 * 1000)
  const rateLimiter = createRateLimiter(sendDelayMs)

  const pendingUsers = await strapi.documents("plugin::users-permissions.user").findMany({
    filters: {
      invitationStatus: "pending",
      blocked: false,
    },
    limit,
    populate: {
      player: { fields: ["name"] },
    },
  })

  for (const user of pendingUsers as InvitationUser[]) {
    if (!user.email) continue

    // ATOMIC CLAIM: Try to claim this user for processing
    // Only one container will succeed in multi-container deployments
    const claimed = await claimUserForProcessing(strapi, user.documentId, "pending", "processing")

    if (!claimed) {
      // Another container already claimed this user or status changed
      strapi.log.debug(`[Invitations] User ${user.email} already being processed, skipping`)
      continue
    }

    try {
      const resetToken = createResetPasswordToken()
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: { resetPasswordToken: resetToken } as any,
      })
      await sendWithRateLimit(
        strapi,
        user,
        false,
        resetToken,
        rateLimiter,
        maxRetries,
        retryDelayMs
      )
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "sent",
          invitationSentAt: new Date().toISOString(),
        } as any,
      })
      strapi.log.info(`[Invitations] Sent invite to ${user.email}`)
    } catch (error) {
      // Revert status to pending so this user can be retried on next cron run
      await revertUserStatus(strapi, user.documentId, "pending")
      reportInvitationError(strapi, user, false, error)
    }
  }

  const reminderUsers = await strapi.documents("plugin::users-permissions.user").findMany({
    filters: {
      invitationStatus: "sent",
      invitationSentAt: { $lt: reminderThreshold.toISOString() },
      invitationReminderSentAt: { $null: true },
      blocked: false,
    },
    limit,
    populate: {
      player: { fields: ["name"] },
    },
  })

  for (const user of reminderUsers as InvitationUser[]) {
    if (!user.email) continue

    // ATOMIC CLAIM: Try to claim this user for reminder processing
    // Uses "reminding" as intermediate status to prevent duplicates
    const claimed = await claimUserForProcessing(strapi, user.documentId, "sent", "reminding")

    if (!claimed) {
      // Another container already claimed this user or status changed
      strapi.log.debug(
        `[Invitations] User ${user.email} already being processed for reminder, skipping`
      )
      continue
    }

    try {
      const resetToken = createResetPasswordToken()
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: { resetPasswordToken: resetToken } as any,
      })
      await sendWithRateLimit(strapi, user, true, resetToken, rateLimiter, maxRetries, retryDelayMs)
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "reminded",
          invitationReminderSentAt: new Date().toISOString(),
        } as any,
      })
      strapi.log.info(`[Invitations] Sent reminder to ${user.email}`)
    } catch (error) {
      // Revert status to sent so this user can be retried on next cron run
      await revertUserStatus(strapi, user.documentId, "sent")
      reportInvitationError(strapi, user, true, error)
    }
  }
}
