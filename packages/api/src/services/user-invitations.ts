import type { Core } from "@strapi/strapi"
import { render } from "@react-email/render"
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

function buildInviteUrl(): string {
  const frontendUrl = process.env.FRONTEND_URL || "https://play14.org"
  const callbackUrl = encodeURIComponent("/admin")
  return `${frontendUrl}/auth/login?callbackUrl=${callbackUrl}`
}

function buildEmailPayload(user: InvitationUser, reminder: boolean) {
  const inviteUrl = buildInviteUrl()
  const html = render(
    UserInvitationEmail({
      name: user.player?.name || user.username,
      inviteUrl,
      reminder,
    })
  )
  const text = render(
    UserInvitationEmail({
      name: user.player?.name || user.username,
      inviteUrl,
      reminder,
    }),
    { plainText: true }
  )
  const subject = reminder
    ? "Reminder: your #play14 account is ready"
    : "You're invited to #play14"

  return { html, text, subject }
}

async function sendInvitationEmail(
  strapi: Core.Strapi,
  user: InvitationUser,
  reminder: boolean
) {
  const payload = buildEmailPayload(user, reminder)
  await strapi.plugin("email").service("email").send({
    to: user.email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })
}

export async function processUserInvitations(strapi: Core.Strapi): Promise<void> {
  if (process.env.INVITATION_EMAILS_ENABLED === "false") {
    return
  }

  const limit = Number(process.env.INVITATION_SEND_LIMIT || DEFAULT_INVITE_LIMIT)
  const reminderDays = Number(
    process.env.INVITATION_REMINDER_DAYS || DEFAULT_REMINDER_DAYS
  )
  const reminderThreshold = new Date(Date.now() - reminderDays * 24 * 60 * 60 * 1000)

  const pendingUsers = await strapi
    .documents("plugin::users-permissions.user")
    .findMany({
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
    try {
      await sendInvitationEmail(strapi, user, false)
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "sent",
          invitationSentAt: new Date().toISOString(),
        } as any,
      })
      strapi.log.info(`[Invitations] Sent invite to ${user.email}`)
    } catch (error) {
      strapi.log.error(`[Invitations] Failed to send invite to ${user.email}: ${error}`)
    }
  }

  const reminderUsers = await strapi
    .documents("plugin::users-permissions.user")
    .findMany({
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
    try {
      await sendInvitationEmail(strapi, user, true)
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: user.documentId,
        data: {
          invitationStatus: "reminded",
          invitationReminderSentAt: new Date().toISOString(),
        } as any,
      })
      strapi.log.info(`[Invitations] Sent reminder to ${user.email}`)
    } catch (error) {
      strapi.log.error(`[Invitations] Failed to send reminder to ${user.email}: ${error}`)
    }
  }
}
