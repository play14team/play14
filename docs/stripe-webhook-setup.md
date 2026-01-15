# Stripe Webhook Setup Guide

Quick reference for setting up Stripe webhooks for the #play14 platform.

## Overview

The platform uses **two separate Stripe webhook endpoints** with different signing secrets:

1. **Platform Account Webhook** - Handles direct platform payments
2. **Connected Accounts Webhook** - Handles Stripe Connect events

Both webhooks point to the **same API endpoint** (`/api/webhooks/stripe`), which automatically verifies signatures against both secrets.

## Setup Instructions

### Step 1: Create Platform Account Webhook

In Stripe Dashboard → Developers → Webhooks:

1. Click **"Add endpoint"**
2. Configure:
   - **Endpoint URL**: `https://community-acc.play14.org/api/webhooks/stripe` (for acceptance)
   - **Description**: Platform payments webhook
   - **Events from**: **Your account** (NOT "Connected accounts")
   - **API version**: `2025-12-15.clover` (or latest)
3. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
4. Click **"Add endpoint"**
5. **Reveal** and copy the signing secret (starts with `whsec_...`)

### Step 2: Create Connected Accounts Webhook

In Stripe Dashboard → Developers → Webhooks:

1. Click **"Add endpoint"**
2. Configure:
   - **Endpoint URL**: `https://community-acc.play14.org/api/webhooks/stripe` (same URL!)
   - **Description**: Connected accounts webhook
   - **Events from**: **Connected accounts** (NOT "Your account")
   - **API version**: `2025-12-15.clover` (or latest)
3. Select events:
   - ✅ `account.updated`
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.expired`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
4. Click **"Add endpoint"**
5. **Reveal** and copy the signing secret (starts with `whsec_...`)

### Step 3: Update Environment Variables

Edit `packages/api/.env`:

```bash
# Platform webhook (from Step 1)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Connected accounts webhook (from Step 2)
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_yyyyyyyyyyyyyyyyyyyyyy
```

### Step 4: Restart API

```bash
bun --filter play14-api dev
```

## Testing Webhooks

### Test Platform Webhook

```bash
# List recent events
stripe events list --type checkout.session.completed --limit 5

# Resend a specific event to platform webhook
stripe events resend evt_xxxxx --webhook-endpoint we_platform_webhook_id
```

### Test Connected Accounts Webhook

```bash
# List account events
stripe events list --type account.updated --limit 5

# Resend to connected accounts webhook
stripe events resend evt_xxxxx --webhook-endpoint we_connect_webhook_id
```

### Local Testing with Stripe CLI

```bash
# Forward all webhooks to local API
podman-compose up stripe-webhook

# Or manually forward platform events
stripe listen --forward-to localhost:1337/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.expired,payment_intent.payment_failed,charge.refunded

# Trigger test events
stripe trigger checkout.session.completed
```

## Verification

### Check Webhook Handler Logs

After resending an event, check the API logs:

```bash
# Look for webhook processing messages
bun --filter play14-api dev

# Expected log output:
# [Webhook] Received Stripe event: checkout.session.completed (evt_xxx)
# [Webhook] Processing order ORD-xxx (locked with processing status)
# [Webhook] Order ORD-xxx completed successfully with 2 tickets
```

### Verify in Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on each webhook endpoint
3. Check **"Event deliveries"** tab
4. Look for:
   - ✅ HTTP status 200 (success)
   - ❌ HTTP status 400/500 (failure)

## Troubleshooting

### Error: "Webhook verification failed"

**Cause**: Wrong webhook secret or signature mismatch.

**Solution**:
1. Verify you copied the correct signing secret from Stripe Dashboard
2. Check that you're using the secret for the correct webhook (platform vs connect)
3. Restart the API after updating `.env`

### Error: "Event already processed"

**Cause**: Webhook event already handled (idempotency check).

**Solution**: This is normal! The system prevents duplicate processing. Try a different event ID.

### Events Not Arriving

**Cause**: Wrong "Events from" setting in webhook configuration.

**Solution**:
- Platform payments → Webhook must listen to "Your account"
- Connect payments/accounts → Webhook must listen to "Connected accounts"

## Environment-Specific URLs

| Environment | Webhook URL |
|-------------|-------------|
| Production | `https://community.play14.org/api/webhooks/stripe` |
| Acceptance | `https://community-acc.play14.org/api/webhooks/stripe` |
| Development | `http://localhost:1337/api/webhooks/stripe` |

## Security Notes

- ✅ Each webhook has its own signing secret
- ✅ The API automatically tries both secrets for verification
- ✅ Both secrets must be set in environment variables
- ✅ Secrets are never exposed to the frontend
- ✅ HTTPS is required in production (enforced by Stripe)

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Connect Webhooks](https://stripe.com/docs/connect/webhooks)
- [packages/api/src/services/payment/providers/stripe.ts](../packages/api/src/services/payment/providers/stripe.ts) - Dual-secret verification implementation
- [docs/specs/stripe-connect-ticketing.md](./specs/stripe-connect-ticketing.md) - Full technical specification
