---
name: stripe-webhook-replay
description: Recover stuck Stripe webhook deliveries in the play14 platform — find affected orders, reset them to `pending` while pushing past the 30-minute auto-expiry cron, clear the dedupe rows in `processed_webhooks` so the resend isn't short-circuited, and replay the events through the Stripe CLI. Trigger proactively whenever the user mentions stuck/missing tickets, paid orders showing as expired, "paidAt is null", "the webhook didn't fire", failed Stripe deliveries (especially after a hosting migration or webhook URL change), or anything that smells like webhook drift. The order-state machine plus the cleanup cron interact in a way that the obvious "just resend it" path silently no-ops — this skill encodes the guards that make replay actually work.
---

# stripe-webhook-replay

When Stripe webhook deliveries fail in play14 (URL change, secret rotation, app outage), the symptom is paid orders that show no `paidAt`, no tickets created, and the customer waiting on confirmation. The naive recovery — "just hit Resend in Stripe Dashboard" — silently no-ops because the order-state machine has already moved on:

1. Stripe checkout completes → `ticket-orders.order_status` is `pending`, `reservationExpiresAt` is set.
2. Webhook delivery fails (signature mismatch, wrong host, app down).
3. Within 5 minutes, the `cleanExpiredTicketOrders` cron in `packages/api/src/services/cron/ticket-orders.ts` flips `pending` orders past `reservationExpiresAt` to `expired` (or `pending` orders older than 30 min if no reservation expiry is set).
4. Stripe finally replays the webhook (or the URL gets fixed and you click Resend).
5. The handler in `packages/api/src/api/ticket-order/controllers/webhook.ts` runs the atomic conditional update `WHERE order_status = 'pending'`, matches **0 rows**, logs `Order ... skipped - current status: expired`, marks the event `completed` in `processed_webhooks`, and exits without setting `paidAt` or creating tickets.

This skill walks through the recovery without falling into that trap.

## When to use

- Stripe Dashboard shows non-zero failed deliveries on either webhook endpoint.
- DB has orders with `order_status` in `('expired', 'failed')` that customers say they paid for.
- DB has orders where `total_amount > 0` but `paid_at IS NULL` and `provider_session_id IS NOT NULL`.
- Recently changed the webhook URL, rotated a signing secret, or migrated hosting.

## Prerequisites

- **Stripe CLI** authenticated against the live account. The CLI's default OAuth pairing produces a restricted key — **`events.resend` requires either the standard `sk_live_…` secret OR a restricted key with both `Webhook Endpoints: Write` AND `Events: Write`**. The simplest path is to set `STRIPE_API_KEY=sk_live_…` in the shell once and use `--api-key "$STRIPE_API_KEY"` on every CLI call. Do not paste the secret key into the conversation; have the user export it.
- **Direct DB access** to production PostgreSQL (Clever Cloud `POSTGRESQL_ADDON_*` credentials), OR a **Strapi full-access API token** (the user can create one in Settings → API Tokens, scope it temporarily, **revoke it after the recovery completes**).
- **Confirm we're on the right hosts**: production webhooks must point to `https://api.play14.org/api/webhooks/stripe`. After a hosting migration, both endpoints (platform + Connect — see `packages/api/CLAUDE.md` "Dual Webhook Architecture") need to be checked in Stripe Dashboard → Developers → Webhooks.

## Workflow

### 1. Identify failed events from Stripe

```bash
# Confirm current endpoint URLs (both should point to api.play14.org)
stripe webhook_endpoints list --live

# Subscribed event types per the Strapi handler:
SUBSCRIBED='checkout.session.completed checkout.session.expired payment_intent.payment_failed charge.refunded account.updated'

# Pull recent events on the platform account (last 30 days — Stripe's retention)
THIRTY_DAYS_AGO=$(date -d '30 days ago' +%s)
for TYPE in $SUBSCRIBED; do
  stripe events list --live --limit 100 --type "$TYPE" \
    | jq -r --argjson cutoff "$THIRTY_DAYS_AGO" \
        '.data[] | select(.created >= $cutoff)
         | [.id, (.created | strftime("%Y-%m-%d %H:%M")), .type,
            (.data.object.id // "-"), (.pending_webhooks | tostring)] | @tsv'
done
```

Repeat with `--stripe-account acct_...` for each connected account (their events arrive on the Connect endpoint, not the platform endpoint). List connected accounts via `stripe accounts list --live`.

`pending_webhooks=0` means Stripe has stopped retrying (delivered or gave up). `pending_webhooks=1` means it's still queued. Either way, `events.resend` works for events within the 30-day retention window.

### 2. Classify the events

Group findings into:

- **Critical — `checkout.session.completed`** — these create tickets, mark `paid`, send confirmation emails. Replay has high priority.
- **`checkout.session.expired`** — these mark abandoned orders as `expired` and release reservations. Replay is "nice to have" for clean state.
- **`payment_intent.payment_failed`** — marks an order `failed`, releases reservations. Replay if the order is still `pending`.
- **`charge.refunded`** — refund flow. If the dashboard refund didn't propagate, replay.
- **`account.updated`** — Connect account status. Replay only when host capabilities seem stale.

For the critical bucket, pull each event's session details so you can match them to orders:

```bash
for E in $EVENT_IDS; do
  stripe events retrieve "$E" --live \
    | jq -r '[.id, .type, (.created | strftime("%Y-%m-%d %H:%M")),
              (.data.object.amount_total // .data.object.amount // 0 | tostring),
              (.data.object.customer_email // "-"),
              (.data.object.metadata.orderId // "-"),
              .data.object.id] | @tsv'
done
```

The `metadata.orderId` is the Strapi `documentId` (set by `custom-ticket-order.ts` when initiating checkout). The `data.object.id` is the `cs_live_...` session ID — this is what you'll match against `provider_session_id` in the DB.

### 3. Diagnose order state in the DB

For each affected session, look up the order:

```sql
SELECT id, order_number, order_status, paid_at, provider_session_id,
       reservation_expires_at, has_reservation, total_amount, purchaser_email
FROM ticket_orders
WHERE provider_session_id IN (
  'cs_live_xxx',
  'cs_live_yyy',
  ...
);
```

(Note: column is `order_status` post-rename of 2026-05. If the DB pre-dates that migration, the column is `status`. Confirm with `\d ticket_orders` first.)

Four buckets:

- `order_status = 'paid'`, `paid_at IS NOT NULL` → already recovered, skip.
- `order_status IN ('expired', 'failed')`, `paid_at IS NULL` → **needs reset before resend**.
- `order_status = 'pending'`, `paid_at IS NULL`, `reservation_expires_at` in past → cron will eat it within 5 min if you don't reset; reset it now.
- `order_status = 'processing'`, `paid_at IS NULL` → **orphaned mid-handler crash**. Both the cleanup cron and the webhook handler use `'processing'` as their exclusive row lock. If the Strapi process was killed (SIGTERM during a deploy, OOM) between the atomic claim and the `documents().update()` call, the order is stuck: the cron's `pending`-only filter skips it, and a replayed webhook hits 0 rows in the `WHERE order_status = 'pending'` conditional update and exits via `skipped_terminal`. **Treat these the same as `expired`/`failed` — include them in the reset transaction below.** Run this query as part of step 3 to surface them:

```sql
SELECT id, order_number, order_status, paid_at, provider_session_id,
       reservation_expires_at, updated_at, purchaser_email
FROM ticket_orders
WHERE order_status = 'processing'
  AND paid_at IS NULL
  AND updated_at < NOW() - INTERVAL '15 minutes';
```

Anything older than ~15 min in `processing` without a `paid_at` is recoverable: a healthy webhook handler completes within seconds, and the cleanup cron only ever holds the lock for one `documents().update()` call. Add the matching `provider_session_id` values to the reset list in step 4.

### 4. Reset orders before replay

For the orders that need replaying, run the reset transaction. The `reservation_expires_at = NOW() + 1h` is the critical guard against the cleanup cron racing the webhook. Run as ONE TRANSACTION; do NOT split the UPDATE and DELETE.

```sql
BEGIN;

-- Flip target orders back to pending and push the cron's expiry guard out
UPDATE ticket_orders
SET order_status = 'pending',
    reservation_expires_at = NOW() + INTERVAL '1 hour',
    has_reservation = TRUE,
    updated_at = NOW()
WHERE provider_session_id IN ('cs_live_xxx', 'cs_live_yyy', ...)
  AND order_status IN ('expired', 'failed');
-- Expect: UPDATE N (= number of orders you intend to recover)

-- Clear the idempotency dedupe rows so claimWebhookEvent doesn't short-circuit
-- the resend with shouldProcess: false
DELETE FROM processed_webhooks
WHERE event_id IN ('evt_xxx', 'evt_yyy', ...);
-- Expect: DELETE N (or fewer if some weren't claimed)

-- Verify before committing
SELECT order_number, order_status, reservation_expires_at, purchaser_email
FROM ticket_orders
WHERE provider_session_id IN ('cs_live_xxx', 'cs_live_yyy', ...);
-- All should show order_status = 'pending', reservation_expires_at ~1h in future

COMMIT;
```

If the user's DB client returns "Execution completed" with no row counts visible, force a result set with `RETURNING id, order_number, order_status` on the UPDATE so they can see what was touched. Some clients silently roll back multi-statement scripts when run via "execute file" — if the verification SELECT shows nothing changed, ask the user to run each statement separately.

### 5. Replay events via Stripe CLI

Stripe needs to know which webhook endpoint to deliver to (they each have their own signing secret):

- **Platform endpoint** (`we_...`) — events on the platform account; subscribed to `charge.refunded`, `checkout.session.expired`, `checkout.session.completed`, `payment_intent.payment_failed`.
- **Connect endpoint** (`we_...`, marked with `application: "ca_..."`) — events from connected accounts; same subscriptions plus `account.updated`.

Use `stripe webhook_endpoints list --live` to see them.

```bash
# Replay a batch
ENDPOINT=we_1XXX...  # the platform or Connect endpoint, depending on event source
for E in evt_xxx evt_yyy evt_zzz; do
  echo "Resending $E..."
  stripe events resend "$E" \
    --api-key "$STRIPE_API_KEY" \
    --live \
    --webhook-endpoint "$ENDPOINT" \
    | jq '{id, type, pending_webhooks}'
done
```

Each call returns the event payload. `pending_webhooks: 1` after the call means a fresh delivery attempt has been queued. The handler should run within seconds.

### 6. Verify the recovery

```sql
-- All resent orders should now show paid (or expired for the deliberate ones)
SELECT order_number, order_status, paid_at, total_amount, purchaser_email
FROM ticket_orders
WHERE provider_session_id IN ('cs_live_xxx', 'cs_live_yyy', ...)
ORDER BY paid_at DESC NULLS LAST;

-- Tickets should exist for every paid order
SELECT t.ticket_code, t.attendee_name, t.attendee_email, o.order_number
FROM tickets t
JOIN ticket_orders o ON o.id = t.order_id
WHERE o.provider_session_id IN ('cs_live_xxx', 'cs_live_yyy', ...);

-- Idempotency rows should be re-claimed by the resend
SELECT event_id, event_type, status, processed_at
FROM processed_webhooks
WHERE event_id IN ('evt_xxx', 'evt_yyy', ...)
ORDER BY created_at DESC;
```

Cross-check externally:

- Stripe Dashboard → Webhooks → endpoint → Event deliveries — failed entries should now show 200 responses for the resends.
- `pending_webhooks` on the resent events should be 0 (delivered).

### 7. Edge cases

- **Order is `paid` already but `paidAt IS NULL`** — this is rare and indicates a partial-handler crash, not a missed webhook. Don't reset to `pending`; investigate the `[Webhook]` logs for that `correlationId` instead. Manual fix: run the missing post-update steps (ticket creation, attendee linkage) by hand or invoke `handleCheckoutCompleted` from a one-off Strapi script.
- **Event is older than 30 days** — Stripe drops it from retention. `events.resend` returns `event not found`. The fallback is a one-off Strapi script that calls `handleCheckoutCompleted` directly with a synthesized session payload. Build that payload from `data.object` of the event JSON (you can save the Stripe API output before it ages out), then load the script via `bun --filter play14-api strapi console`.
- **The order has `reservedCount` discrepancies** — `cleanExpiredTicketOrders` decrements `ticket_types.reserved_count` when it expires an order, then `confirmReservations` (called by the webhook handler on success) tries to confirm reservations that were already released. This produces a "missing reservation" warning but does NOT block ticket creation. The reservation-drift check (`reservationHealthCheck` cron, daily 01:00 UTC) reconciles the counts. No manual fix needed.
- **Connect account events on the platform endpoint** — won't deliver. Connect events go ONLY to the Connect endpoint. If you're replaying from the wrong endpoint, the resend succeeds but the handler doesn't see it because the signature is verified against the wrong secret.

## Pre-flight: prevent recurrence

If the failures came from a hosting migration or URL change, fix the cause before mass-replaying:

1. Stripe Dashboard → Developers → Webhooks → both endpoints → set URL to `https://api.play14.org/api/webhooks/stripe`.
2. Confirm signing secrets match the Clever Cloud env vars:
   ```bash
   clever env -a play14-api | grep -E "STRIPE_(WEBHOOK_SECRET|WEBHOOK_SECRET_CONNECT)"
   ```
   If they don't match Stripe's "Reveal signing secret":
   ```bash
   clever env set STRIPE_WEBHOOK_SECRET whsec_xxx -a play14-api
   clever env set STRIPE_WEBHOOK_SECRET_CONNECT whsec_xxx -a play14-api
   clever restart -a play14-api
   ```
3. Send a test webhook from Stripe Dashboard ("Send test webhook") and confirm a 200 response + a fresh row in `processed_webhooks` before mass-replaying.

## Cleanup

- **Revoke the temporary Strapi API token** (Settings → API Tokens → Delete) once the recovery completes.
- **`unset STRIPE_API_KEY`** in the user's shell so the secret doesn't linger.
- If logs were spammed by the silent skips during the failure window, capture a sample for the post-mortem (`clever logs -a play14-api --since 7d | grep "skipped - current status: expired"`).

## Why this skill exists

The "Validation error: Invalid status" admin issue and the cron's race against late webhooks are both inherent to the play14 ticket-order state machine. Both have happened; both will happen again. The handler's silent-skip path (at `webhook.ts` around the `WHERE order_status = 'pending'` conditional update) is correct — it prevents double-processing on duplicate deliveries — but it also means a late delivery looks identical to a duplicate and we lose the signal. Until that handler grows a `warn`-level log + Prometheus counter for "arrived for a non-pending terminal-state order", this manual recovery is the canonical path.

## Coordination

When the recovery is for orders impacted by a `rename-strapi-attribute` migration (e.g. `status → orderStatus`), confirm the column name in the DB FIRST (`\d ticket_orders`). The SQL in this skill assumes the post-rename schema (`order_status`); pre-rename, swap to `status` everywhere.
