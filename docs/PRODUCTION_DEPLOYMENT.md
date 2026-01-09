# Production Deployment Guide

## Document Info

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | 2026-01-10 |
| **Branch** | `feat/admin-panel-oauth` |
| **Status** | Pre-deployment checklist |

---

## 1. Feature Summary

This branch introduces a complete admin panel and ticketing system for #play14. The following major features are included:

### 1.1 Authentication & Authorization
- OAuth login (GitHub, Google, LinkedIn)
- Username/password registration and login
- Role-based permissions (Player < Host < Mentor < Founder)
- Position-based role auto-assignment
- Player profile linking flow for new users

### 1.2 Ticketing & Payments (Stripe)
- Stripe Connect Express for host payment accounts
- Ticket types with pricing, availability, and sales periods
- Checkout flow with Stripe-hosted payments
- Discount codes with various discount types
- Webhook handling for payment events
- Revenue analytics dashboard

### 1.3 Admin Panel
- Event management (create, edit, publish/unpublish)
- Player management with avatar uploads
- Venue and location management
- Schedule editor with templates
- Media library browser
- Sponsor management
- Host and mentor assignment

### 1.4 Claims System
- Player claim system (linking existing player profiles)
- Event attendance claims
- Email notifications for claims

### 1.5 Email Notifications
- Purchase confirmation emails
- Payment failure notifications
- Claim status notifications

---

## 2. Environment Variables Checklist

### 2.1 API Package (`packages/api`)

#### Required for Production

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `NODE_ENV` | Environment mode | `production` | [ ] |
| `HOST` | Server host | `0.0.0.0` | [ ] |
| `PORT` | Server port | `1337` | [ ] |
| `APP_KEYS` | Session encryption keys (comma-separated) | `key1,key2,key3,key4` | [ ] |
| `PUBLIC_URL` | Public API URL | `https://community.play14.org` | [ ] |

#### Database

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `DATABASE_CLIENT` | Database type | `postgres` | [ ] |
| `DATABASE_HOST` | Database host | `play14-db.postgres.database.azure.com` | [ ] |
| `DATABASE_PORT` | Database port | `5432` | [ ] |
| `DATABASE_NAME` | Database name | `play14` | [ ] |
| `DATABASE_USERNAME` | Database user | `strapi` | [ ] |
| `DATABASE_PASSWORD` | Database password | `***` | [ ] |
| `DATABASE_SSL` | Enable SSL | `true` | [ ] |

#### Security & Authentication

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `API_TOKEN_SALT` | Salt for API tokens | `random-string` | [ ] |
| `ADMIN_JWT_SECRET` | Admin panel JWT secret | `random-string` | [ ] |
| `JWT_SECRET` | User JWT secret | `random-string` | [ ] |
| `TRANSFER_TOKEN_SALT` | Transfer token salt | `random-string` | [ ] |

#### Azure Storage

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `STORAGE_ACCOUNT` | Azure storage account name | `play14storage` | [ ] |
| `STORAGE_ACCOUNT_KEY` | Azure storage account key | `***` | [ ] |
| `STORAGE_CONTAINER_NAME` | Blob container name | `strapi_uploads` | [ ] |
| `STORAGE_URL` | Storage base URL | `https://play14storage.blob.core.windows.net` | [ ] |
| `STORAGE_CDN_URL` | CDN URL for assets | `https://cdn.play14.org` | [ ] |

#### Stripe (NEW - Critical for Ticketing)

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_...` | [ ] |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` | [ ] |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_live_...` | [ ] |
| `STRIPE_PLATFORM_FEE_PERCENT` | Platform fee percentage | `0` | [ ] |

#### Email (Resend)

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `RESEND_API_KEY` | Resend API key | `re_...` | [ ] |
| `RESEND_DEFAULT_FROM` | Default sender email | `noreply@play14.org` | [ ] |
| `RESEND_REPLY_TO` | Reply-to address | `community@play14.org` | [ ] |
| `EMAIL_ADMIN_RECIPIENTS` | Admin notification emails | `admin@play14.org` | [ ] |
| `FRONTEND_URL` | Frontend URL for email links | `https://play14.org` | [ ] |

#### GitHub Integration

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `GITHUB_TOKEN` | GitHub PAT for triggering rebuilds | `ghp_...` | [ ] |
| `GITHUB_OWNER` | GitHub organization | `play14team` | [ ] |
| `GITHUB_REPO` | GitHub repository | `play14-web` | [ ] |
| `GITHUB_WORKFLOW_ID` | Workflow ID to trigger | `52506304` | [ ] |
| `GITHUB_BRANCH` | Branch to trigger | `main` | [ ] |

#### Mapbox

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN` | Mapbox token for admin panel | `pk.xxx` | [ ] |

#### Cron Jobs

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `CRON_ENABLED` | Enable scheduled tasks | `true` | [ ] |

### 2.2 Web Package (`packages/web`)

| Variable | Description | Example | Status |
|----------|-------------|---------|--------|
| `STRAPI_API_URL` | Backend API URL | `https://community.play14.org` | [ ] |
| `STRAPI_API_SECRET` | API authentication token | `***` | [ ] |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox token (client-side) | `pk.xxx` | [ ] |
| `NEXT_PUBLIC_URL` | Frontend URL | `https://play14.org` | [ ] |
| `NEXT_PUBLIC_WEB_VITALS` | Enable Web Vitals | `true` | [ ] |

---

## 3. Stripe Configuration

### 3.1 Switch to Live Mode

Your current Stripe configuration is in **Test Mode**. For production:

1. **Log into Stripe Dashboard**: https://dashboard.stripe.com
2. **Toggle to Live Mode** (switch in top-left corner)
3. **Get Live API Keys**: Developers → API Keys
   - Copy `sk_live_...` → `STRIPE_SECRET_KEY`
   - Copy `pk_live_...` → `STRIPE_PUBLISHABLE_KEY`

### 3.2 Create Live Webhook Endpoint

1. Go to **Developers → Webhooks** (in Live mode)
2. Click **Add endpoint**
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Endpoint URL** | `https://community.play14.org/api/webhooks/stripe` |
   | **Events** | See list below |

4. **Required Events**:
   - `checkout.session.completed` - Payment successful
   - `checkout.session.expired` - Checkout abandoned
   - `payment_intent.payment_failed` - Payment failed
   - `charge.refunded` - Refund processed
   - `account.updated` - Connect account status change

5. **Copy Signing Secret**: After creation, copy `whsec_live_...` → `STRIPE_WEBHOOK_SECRET`

### 3.3 Webhook Verification Checklist

| Check | Status |
|-------|--------|
| Live mode webhook created | [ ] |
| URL matches API endpoint | [ ] |
| All 5 events subscribed | [ ] |
| Signing secret copied to env vars | [ ] |
| Test webhook delivery successful | [ ] |

### 3.4 Stripe Connect Setup

For hosts to receive payments, they'll need to:

1. Go to Admin Panel → My Profile → Stripe tab
2. Click "Connect with Stripe"
3. Complete Stripe Express onboarding

**Platform Settings** (Stripe Dashboard → Connect → Settings):
- Branding: Add #play14 logo and colors
- Onboarding: Enable Express accounts
- Country: Ensure supported countries are enabled

---

## 4. OAuth Providers Configuration

OAuth providers are configured in Strapi Admin UI, not environment variables.

### 4.1 GitHub OAuth

1. Create OAuth App: https://github.com/settings/developers
2. Configure:
   - **Homepage URL**: `https://play14.org`
   - **Callback URL**: `https://play14.org/connect/github/redirect`
3. In Strapi Admin → Settings → Users & Permissions → Providers:
   - Enable GitHub
   - Add Client ID and Secret

### 4.2 Google OAuth

1. Create OAuth credentials: https://console.cloud.google.com/apis/credentials
2. Configure:
   - **Authorized redirect URI**: `https://play14.org/connect/google/redirect`
3. In Strapi Admin → Settings → Users & Permissions → Providers:
   - Enable Google
   - Add Client ID and Secret

### 4.3 LinkedIn OAuth

1. Create App: https://www.linkedin.com/developers/apps
2. Configure:
   - **Redirect URL**: `https://play14.org/connect/linkedin/redirect`
   - **Scopes**: `openid`, `profile`, `email`
3. In Strapi Admin → Settings → Users & Permissions → Providers:
   - Enable LinkedIn
   - Add Client ID and Secret

### 4.4 OAuth Checklist

| Provider | App Created | Callback URL | Strapi Configured | Tested |
|----------|-------------|--------------|-------------------|--------|
| GitHub | [ ] | [ ] | [ ] | [ ] |
| Google | [ ] | [ ] | [ ] | [ ] |
| LinkedIn | [ ] | [ ] | [ ] | [ ] |

---

## 5. Database Migrations

### 5.1 New Content Types

The following content types are new and will be created automatically:

| Content Type | Description |
|--------------|-------------|
| `stripe-account` | Connected Stripe accounts for hosts |
| `ticket-type` | Ticket tiers for events |
| `ticket` | Individual purchased tickets |
| `ticket-order` | Purchase orders |
| `discount-code` | Discount/promo codes |
| `player-claim` | Player profile claims |
| `attendance-claim` | Event attendance claims |

### 5.2 Schema Changes

| Content Type | Changes |
|--------------|---------|
| `event` | Added: `ticketTypes`, `ticketsEnabled`, `authRequired`, `stripeAccount`, `ticketCurrency`, `schedule` |
| `player` | Added: `stripeAccount` relation |
| `venue` | Removed: `shortName` |

### 5.3 Migration Steps

1. **Backup database** before deployment
2. Run Strapi build: `bun run build`
3. Start Strapi: `bun run start`
4. Strapi will auto-create new tables
5. Verify in Strapi Admin → Content-Type Builder

---

## 6. Email Configuration (Resend)

### 6.1 Resend Setup

1. Create account: https://resend.com
2. Add and verify domain: `play14.org`
3. Get API key → `RESEND_API_KEY`

### 6.2 Email Templates

The following emails are sent automatically:

| Trigger | Email | Recipient |
|---------|-------|-----------|
| Ticket purchase | Confirmation with ticket codes | Purchaser |
| Payment failure | Retry prompt | Purchaser |
| Checkout expired | (logged only) | - |
| Player claim submitted | Notification | Admin recipients |
| Player claim approved | Confirmation | Claimant |
| Attendance claim | Notification | Event hosts |

### 6.3 DNS Records Required

Add these DNS records for Resend:

```
Type: TXT
Name: _dmarc.play14.org
Value: v=DMARC1; p=none;

Type: MX
Name: send.play14.org
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Name: send.play14.org
Value: v=spf1 include:amazonses.com ~all
```

---

## 7. Deployment Checklist

### 7.1 Pre-Deployment

- [ ] All environment variables configured in Azure Container Apps
- [ ] Database backup completed
- [ ] Stripe live mode webhook created
- [ ] OAuth providers configured in Strapi Admin
- [ ] Resend domain verified
- [ ] DNS records updated

### 7.2 Deployment

- [ ] Merge `feat/admin-panel-oauth` to `main`
- [ ] CI/CD pipeline triggers
- [ ] Container builds successfully
- [ ] Deployment completes without errors

### 7.3 Post-Deployment Verification

- [ ] API health check: `https://community.play14.org/api/health`
- [ ] Admin panel accessible: `https://community.play14.org/admin`
- [ ] OAuth login works (test each provider)
- [ ] Create test event with ticketing
- [ ] Complete test purchase (use Stripe test card first)
- [ ] Verify webhook received in Stripe Dashboard
- [ ] Verify confirmation email received
- [ ] Test Stripe Connect onboarding flow

### 7.4 Rollback Plan

If issues occur:

1. Scale down new container
2. Restore database from backup
3. Redeploy previous version

---

## 8. Post-Go-Live Tasks

### 8.1 Monitoring

- [ ] Set up Azure Monitor alerts for:
  - Container health
  - API response times
  - Error rates
  - Database connection pool

- [ ] Monitor Stripe Dashboard for:
  - Failed payments
  - Webhook delivery issues
  - Disputed charges

### 8.2 Documentation

- [ ] Update user documentation for:
  - Host onboarding guide (Stripe Connect)
  - Event creation with ticketing
  - Discount code creation

### 8.3 Communication

- [ ] Announce new features to community
- [ ] Notify existing hosts about Stripe Connect

---

## 9. Security Considerations

### 9.1 Secrets Management

- All secrets stored in Azure Key Vault (referenced by Container Apps)
- Never commit secrets to repository
- Rotate secrets periodically

### 9.2 Stripe Security

- Webhook signature verification enabled
- PCI DSS compliance handled by Stripe Checkout (hosted)
- No raw card data stored

### 9.3 Authentication

- JWT tokens with secure secrets
- OAuth tokens not stored (stateless)
- Session expiry configured

---

## 10. Support Contacts

| Issue | Contact |
|-------|---------|
| Stripe Support | https://support.stripe.com |
| Resend Support | https://resend.com/support |
| Azure Support | Azure Portal → Help + Support |

---

## Appendix: Quick Reference

### Stripe CLI Commands

```bash
# List webhooks
stripe webhook_endpoints list

# Test webhook locally
stripe listen --forward-to localhost:1337/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger checkout.session.expired
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

### Azure CLI Commands

```bash
# Check container app env vars
az containerapp show --name play14-api --resource-group play14-community \
  --query "properties.template.containers[0].env"

# Update env var
az containerapp update --name play14-api --resource-group play14-community \
  --set-env-vars "STRIPE_SECRET_KEY=sk_live_xxx"

# View logs
az containerapp logs show --name play14-api --resource-group play14-community --follow
```
