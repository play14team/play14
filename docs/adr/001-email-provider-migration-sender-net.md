# ADR-001: Migrate email provider from Resend to Sender.net

- **Status:** Accepted
- **Date:** 2025-02-05
- **Decision makers:** Cedric Pontet

## Context

The #play14 community platform uses email for two purposes:

1. **Transactional emails** — notifications (player claims, attendance claims, ticket confirmations, payment failures, invitations, event reminders). Sent via Strapi's email plugin, rendered with React Email templates.
2. **Newsletter broadcasting** — monthly community newsletter sent to all subscribers. Managed through a custom admin UI with AI-assisted content generation.

Both were powered by **Resend**. Resend's free tier limits marketing contacts (audience/segments) to **1,000**. The community has grown to **~1,300 subscribers** and is still growing, making Resend's free tier no longer viable.

### Requirements

- Support **1,300+ contacts** on a free tier (with room to grow)
- Send both **transactional emails** and **newsletters** to all contacts
- Provide a **REST API** for full automation (no manual dashboard workflows)
- Integrate with **Strapi's email provider plugin** interface for transactional emails
- No daily sending cap that would prevent sending a newsletter to all contacts at once
- Free, or cheapest possible paid tier as fallback

## Alternatives considered

### Global providers

| Provider | Free contacts | Free emails/mo | Daily cap | Txn + Newsletter | Fits 1,300 free? |
|---|---|---|---|---|---|
| **Sender.net** | **2,500** | **15,000** | None | Both via REST | **Yes** |
| **Brevo** (ex-Sendinblue) | 100,000 | ~9,000 | **300/day** | Both via REST | Stores contacts but 300/day cap blocks newsletters |
| **Resend** (incumbent) | 1,000 mktg | 3,000 txn | 100/day txn | Both via REST | **No** — hit limit |
| **Mailchimp** | 250 | 500 | 250 | Txn = paid add-on | No |
| **MailPace** | ~100 | ~100 | — | Txn only, no newsletter | No |
| **Loops** | 1,000 | 4,000 | — | Both | No |
| **Mailjet** | 1,000 | 6,000 | 200 | Both | No |
| **Mailtrap** | 500 | 1,000 | 200 | Both | No |

#### Brevo — runner-up

Brevo was the strongest alternative: 100,000 free contacts, a mature REST API, and an existing Strapi plugin. However, the **300 emails/day cap** on the free tier makes it impossible to send a newsletter to 1,300 contacts in a single day. This is a dealbreaker for a monthly newsletter workflow that expects immediate delivery.

#### Resend — incumbent

Resend has an excellent developer experience and a clean API, but the 1,000 marketing contact limit is a hard wall. The only option would be to upgrade to a paid plan ($20/month for 5,000 contacts), which is disproportionate for a non-profit community sending one newsletter per month.

### European alternatives

Evaluated all providers listed on [european-alternatives.eu/category/email-marketing-services](https://european-alternatives.eu/category/email-marketing-services):

| Provider | Country | Free contacts | Free emails/mo | Txn REST API | Newsletter REST API | Viable? |
|---|---|---|---|---|---|---|
| **Brevo** | France | 100,000 | ~9,000 | Yes | Yes | 300/day cap blocks newsletters |
| **Keila** | Germany | Unlimited (self-hosted) | Unlimited* | No (on roadmap) | Yes | No transactional API |
| **Mailcoach** | Belgium | 0 (no free tier) | 0 | Yes | Yes | EUR 9.99/mo minimum |
| **CleverReach** | Germany | 250 | 1,000 | SMTP only | Yes | Too few contacts |
| **GetResponse** | Poland | 500 | 2,500 | Enterprise only ($119+) | Yes | Txn API too expensive |
| **Omnisend** | Lithuania | 250 | 500 | Yes | Via automations | Too few contacts |
| **MailUp** | Italy | 0 (no free tier) | 0 | Yes (add-on) | Yes | EUR 19/mo + add-on |
| **rapidmail** | Germany | 10 | 100 | SMTP only | Unclear | Useless free tier |
| **Acumbamail** | Spain | 250 | 2,000 | SMTP only | Yes | Too few contacts |
| **Clever Elements** | Germany | Trial only | Trial | Unknown | SOAP only | No REST API |
| **Friendly Automate** | Switzerland | 0 | 0 | Yes | Yes | CHF 5,000/mo |

**None of the European alternatives match Sender.net's free tier** for both contact limits and API capabilities.

## Decision

**Migrate from Resend to Sender.net.**

Sender.net is the only provider that meets all requirements on a free tier:

- **2,500 contacts** — covers 1,300+ with room to nearly double
- **15,000 emails/month** — sufficient for monthly newsletters + transactional volume
- **No daily sending cap** — can send newsletter to all contacts at once
- **Full REST API** for transactional emails, subscriber management, and campaign broadcasting
- All features included on free tier (transactional, newsletter, automation)
- Cheapest paid tier: $7/month if limits are ever exceeded

## Implementation

### Architecture

The migration preserved the existing two-layer email architecture:

1. **Transactional emails** continue to flow through Strapi's email plugin. A custom local provider (`strapi-provider-email-sender`) translates Strapi's `send()` interface into Sender.net's `POST /v2/message/send` API. No changes were needed in any of the ~15 call sites or React Email templates.

2. **Newsletter system** replaced direct Resend API calls with equivalent Sender.net API calls. Subscriber management uses groups instead of audiences. Broadcasting uses Sender.net's two-step campaign API (create + send) instead of Resend's single broadcast call.

### Key files

| File | Role |
|---|---|
| `packages/api/providers/strapi-provider-email-sender/` | Custom Strapi email provider for Sender.net |
| `packages/api/src/services/sender-subscribers.ts` | Subscriber/group management (replaces `resend-audience.ts`) |
| `packages/api/src/services/sender-broadcast.ts` | Newsletter broadcasting (replaces `resend-broadcast.ts`) |
| `packages/api/config/plugins.ts` | Provider configuration |

### Environment variables

| Variable | Purpose |
|---|---|
| `SENDER_API_KEY` | Sender.net API bearer token |
| `SENDER_GROUP_ID` | Newsletter subscriber group ID |
| `EMAIL_DEFAULT_FROM` | From email address (e.g., `noreply@play14.org`) |
| `EMAIL_REPLY_TO` | Reply-to address (e.g., `community@play14.org`) |

### Sender.net API specifics

- The `from` field in transactional emails must be an object `{ email, name }` — `name` is **required**. The provider parses Strapi's `"Name <email>"` string format and falls back to `"#play14 community"` as default name for plain email addresses.
- Subscriber creation handles duplicates gracefully (422 responses with "already exists" are treated as success).
- Campaign sending is a two-step process: `POST /v2/campaigns` to create, then `POST /v2/campaigns/{id}/send` to dispatch.

## Consequences

### Positive

- No longer blocked by Resend's 1,000 contact limit
- Free tier covers current needs with headroom (2,500 contacts, 15,000 emails/month)
- Same automation level as before — full REST API, no manual dashboard steps
- Transactional email call sites unchanged — the Strapi plugin abstraction worked as designed
- All 424 unit tests pass without modification

### Negative

- No official Node.js SDK or Strapi plugin — required writing a custom provider (~50 lines)
- Sender.net adds branding to emails on the free tier
- Smaller community and ecosystem compared to Resend, Brevo, or SendGrid
- One-time manual step: export contacts from Resend and import into Sender.net group

### Risks

- Sender.net is less established than competitors — if they change pricing or shut down, another migration would be needed. The two-layer architecture (Strapi plugin + service abstraction) limits the blast radius of any future provider swap.
- Free tier limits may eventually be reached as the community grows beyond 2,500 contacts. The $7/month paid tier is a reasonable fallback.
