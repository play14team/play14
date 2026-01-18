# Features summary

## Login & Access

- Multi‑provider OAuth sign‑in (Google, Microsoft, GitHub, LinkedIn/OpenID Connect) with secure session handling.
- Email/username + password registration and login, plus password reset.
- Optional CAPTCHA (Turnstile) for credential logins.
- Post‑login flow to link or claim a player profile, with admin approval for claims.
- Role‑based access mapped to positions (Founder, Mentor, Host, Player).

## Admin Section

- Dedicated admin area with sidebar navigation, dashboard stats, and upcoming events.
- Event management end‑to‑end: create/edit, publish/unpublish, preview, tabbed editor, and unsaved‑changes protection.
- Player management with profile edits, avatar tools, role syncing, filters, and invite workflows.
- Venue and location management with map/geocoding, logo upload, and responsive layouts.
- Claims and attendance workflows with admin notes and email notifications.
- Sponsor management and data import workflow.

## Ticketing & Payments

- Stripe Connect ticketing with host self‑service onboarding and direct payouts to hosts.
- Ticket type configuration, sales windows, quantities, per‑order caps, drag‑and‑drop ordering, and expanded currency support.
- Purchase flow with attendee info collection and auth‑gated checkout where needed.
- Discount codes plus reservation system to prevent overselling.
- Webhook processing for payment lifecycle events with idempotency and refunds/expiry handling.
- Orders and ticket views with invoice PDF downloads; revenue analytics plus budget/results tabs.

---

# Features (incl. tech stuff)

## Login & Access

- Multi‑provider OAuth sign‑in (Google, Microsoft, GitHub, LinkedIn/OpenID Connect) with secure session handling behind proxies.
- Email/username + password registration and login, plus password reset flow; optional Cloudflare Turnstile captcha support.
- Login UI refresh (two‑column layout) and environment‑specific feature flag to show/hide the login entrypoint.
- Post‑login player profile linking (create or claim existing profile), with email verification and admin approval flow.
- Role‑based access mapped to positions (Founder, Mentor, Host, Player) enforced across admin routes.

## Admin Section

- Dedicated admin area with sidebar navigation and dashboard stats/upcoming events; theme toggle and dark‑mode support.
- Event management end‑to‑end: create/edit, publish/unpublish, preview; tabbed editor with schedule, media, finance, tickets, team; dirty‑state tracking and
  unsaved‑changes prompts.
- Player management with profile editing, avatar tools, role syncing; position filters and invite flows.
- Venue and location management with map/geocoding, logo upload, and responsive multi‑column edit forms.
- Claims and attendance workflows (Founders/organizers), with admin notes and email notifications.
- Sponsor management, imports workflow, and Stripe settings integrated into the admin experience.

## Ticketing & Payments

- Native Stripe Connect ticketing with host self‑service onboarding and direct payouts (Express).
- Event ticketing configuration: internal/external mode, ticket types, sales windows, quantities, per‑order caps, drag‑and‑drop ordering; expanded currency
  support.
- Purchase flow on event pages with success/cancel pages, auth gate when required, and attendee info collection (t‑shirt size, food preferences, photo consent).
- Discount codes and reservation system to prevent overselling; free‑ticket handling.
- Webhook processing for platform + connected accounts, idempotency, and handling of failed/expired payments/refunds.
- Orders and tickets management: admin orders view, ticket detail pages, PDF invoice generation/download; revenue analytics and budget/results tabs.

---

Short Draft (150–200 words)
Subject options:

1. Your #play14 admin and ticketing tools are live
2. #play14 platform update: login, admin, and ticketing now available

Hi mentors and hosts,

We’re excited to share a production update for the #play14 platform. The full login experience, organizer admin area, and built‑in ticketing are now available.

Highlights:

- Multiple sign‑in options (OAuth providers plus email/username + password) and password reset.
- Profile linking/claiming so your account matches your player profile.
- Admin dashboard to manage events, players, venues/locations, sponsors, and attendance/claims.
- Ticketing with Stripe Connect so hosts receive payments directly.
- Discount codes, reservation protection, and order/ticket views with invoices.

If you host events, please sign in, connect Stripe in your profile, and review ticket settings for upcoming events. Mentors can also review profiles and ensure details are up to date.

Thanks for helping grow the community, and please share any feedback or issues you find.

---

Full Draft (300–450 words)
Subject options:

1. Production update: login, admin, and ticketing are now live on #play14
2. New host tools: admin management and Stripe ticketing are available

Hi mentors and hosts,

We’ve shipped a major production update to the #play14 platform. The new login experience, expanded admin area, and a complete Stripe‑powered ticketing system are now live for organizers.

What’s new in production:

- Secure login with multiple OAuth providers plus email/username + password, including password reset and optional CAPTCHA.
- Account‑to‑profile linking so your login matches your player profile, with a claim flow when profiles already exist.
- A dedicated admin area with dashboard stats and navigation built for organizers.
- Event management end‑to‑end: create/edit, publish/unpublish, preview, and manage content, schedule, media, and team details.
- Player, venue, location, sponsor, and attendance tools, plus claims workflows with admin notes and email notifications.
- Stripe Connect ticketing with host self‑service onboarding and direct payouts to hosts.
- Ticket configuration for types, pricing, sales windows, quantities, per‑order limits, and drag‑and‑drop ordering.
- Checkout flow with attendee info collection, discount codes, and reservation protection to prevent overselling.
- Orders and tickets views with invoice downloads, plus revenue analytics and budget/results tabs for financial follow‑up.

What we’d like you to do next:

- Hosts: log in, connect Stripe in your profile, and review ticket settings for upcoming events.
- Mentors: verify your profile details and make any updates needed.
- Organizers: check venues/locations and sponsor details so event pages are accurate.
- Everyone: report any issues or missing data so we can iterate quickly.

Thanks for helping us build and maintain #play14. Your feedback is welcome, and we’re excited to keep improving the platform together.

---

Subject options

1. #play14 update for players: login + tickets are live
2. Easier login, simpler ticketing on #play14
3. Your #play14 player experience just improved

Draft (short)
Hi players,

We’ve shipped a production update to #play14 focused on making your experience smoother.

What’s new:

- Sign in with OAuth (Google/Microsoft/GitHub/LinkedIn) or email/username + password, with password reset.
- Link or claim your player profile so your account matches your #play14 identity.
- Buy tickets directly on event pages with Stripe checkout, discount codes, and attendee info capture.
- View your orders and tickets, download invoices, and access refund options when available.

Log in, check your profile, and let us know if anything looks off. Thanks for being part of the community.
