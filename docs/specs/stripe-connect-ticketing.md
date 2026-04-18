# Stripe Connect Ticketing System - Technical Specification

## Document Info

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | 2026-01-04 |
| **Status** | Draft |
| **Author** | Claude |

---

## 1. Overview

### 1.1 Purpose

Implement a native ticketing and payment system for #play14 events using Stripe Connect, enabling:

- Event hosts to receive payments directly to their own Stripe accounts
- Attendees to purchase tickets seamlessly within the platform
- Transparent fee handling with minimal transaction costs
- Full GDPR compliance with EU payment regulations

### 1.2 Goals

1. **Direct Payments**: Each hosting team receives funds directly (no platform pooling)
2. **Minimal Fees**: Use SEPA Direct Debit where possible (0.8% + €0.30, max €6)
3. **Self-Service**: Hosts can onboard their Stripe account without admin intervention
4. **Transparency**: Clear visibility of fees, taxes, and payouts
5. **Sustainability**: Encourage low-carbon payment methods (bank transfers over cards)

### 1.3 Stripe Connect Account Type

**Recommendation: Stripe Connect Express**

| Account Type | Pros | Cons |
|-------------|------|------|
| **Standard** | Full Stripe dashboard access, hosts manage disputes | Complex onboarding, hosts need Stripe knowledge |
| **Express** ✅ | Simplified onboarding, Stripe-hosted dashboard, less liability | Limited customization |
| **Custom** | Full control, white-label | High compliance burden, complex implementation |

**Express accounts** are ideal because:
- Hosts get a simplified onboarding flow (OAuth-style)
- Stripe handles identity verification (KYC)
- Stripe handles disputes and compliance
- Platform can still control payout timing
- Lower implementation complexity

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Event Page          │  Host Dashboard      │  Checkout Flow        │
│  - Ticket selection  │  - Connect account   │  - Stripe Checkout    │
│  - Price display     │  - View payouts      │  - Payment methods    │
│  - Availability      │  - Manage tickets    │  - Confirmation       │
└──────────┬───────────┴──────────┬───────────┴──────────┬────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API (Strapi 5)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Content Types       │  Custom Routes        │  Webhooks            │
│  - Event (extended)  │  - /stripe/connect    │  - checkout.complete │
│  - Ticket            │  - /stripe/checkout   │  - account.updated   │
│  - Order             │  - /stripe/dashboard  │  - payout.paid       │
│  - StripeAccount     │  - /stripe/webhook    │  - dispute.created   │
└──────────┬───────────┴──────────┬───────────┴──────────┬────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Stripe Connect                              │
├─────────────────────────────────────────────────────────────────────┤
│  Connected Accounts  │  Checkout Sessions   │  Payouts              │
│  (Express)           │  (Hosted)            │  (To host bank)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 New Content Types

#### 3.1.1 StripeAccount

Stores connected Stripe account information for hosts.

**Location**: `packages/api/src/api/stripe-account/content-types/stripe-account/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "stripe_accounts",
  "info": {
    "singularName": "stripe-account",
    "pluralName": "stripe-accounts",
    "displayName": "Stripe Account",
    "description": "Connected Stripe accounts for event hosts"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "stripeAccountId": {
      "type": "string",
      "required": true,
      "unique": true,
      "regex": "^acct_[a-zA-Z0-9]+$"
    },
    "player": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::player.player",
      "inversedBy": "stripeAccount"
    },
    "accountStatus": {
      "type": "enumeration",
      "enum": ["pending", "active", "restricted", "disabled"],
      "default": "pending",
      "required": true
    },
    "chargesEnabled": {
      "type": "boolean",
      "default": false
    },
    "payoutsEnabled": {
      "type": "boolean",
      "default": false
    },
    "detailsSubmitted": {
      "type": "boolean",
      "default": false
    },
    "country": {
      "type": "string",
      "maxLength": 2
    },
    "defaultCurrency": {
      "type": "string",
      "maxLength": 3,
      "default": "eur"
    },
    "businessName": {
      "type": "string"
    },
    "onboardingCompleted": {
      "type": "datetime"
    }
  }
}
```

#### 3.1.2 Ticket

Defines ticket types/tiers for events.

**Location**: `packages/api/src/api/ticket/content-types/ticket/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "tickets",
  "info": {
    "singularName": "ticket",
    "pluralName": "tickets",
    "displayName": "Ticket",
    "description": "Ticket types for events"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "description": {
      "type": "text"
    },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event",
      "inversedBy": "tickets"
    },
    "priceAmount": {
      "type": "decimal",
      "required": true,
      "min": 0
    },
    "currency": {
      "type": "string",
      "required": true,
      "default": "eur",
      "maxLength": 3
    },
    "quantity": {
      "type": "integer",
      "min": 0
    },
    "quantitySold": {
      "type": "integer",
      "default": 0,
      "min": 0
    },
    "maxPerOrder": {
      "type": "integer",
      "default": 5,
      "min": 1
    },
    "salesStart": {
      "type": "datetime"
    },
    "salesEnd": {
      "type": "datetime"
    },
    "isActive": {
      "type": "boolean",
      "default": true
    },
    "sortOrder": {
      "type": "integer",
      "default": 0
    },
    "metadata": {
      "type": "json"
    }
  }
}
```

#### 3.1.3 Order

Stores completed purchases.

**Location**: `packages/api/src/api/order/content-types/order/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "orders",
  "info": {
    "singularName": "order",
    "pluralName": "orders",
    "displayName": "Order",
    "description": "Ticket orders and transactions"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "orderNumber": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event",
      "inversedBy": "orders"
    },
    "customer": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::player.player",
      "inversedBy": "orders"
    },
    "customerEmail": {
      "type": "email",
      "required": true
    },
    "customerName": {
      "type": "string",
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "paid", "failed", "refunded", "partially_refunded", "cancelled"],
      "default": "pending",
      "required": true
    },
    "stripeCheckoutSessionId": {
      "type": "string",
      "unique": true
    },
    "stripePaymentIntentId": {
      "type": "string"
    },
    "subtotalAmount": {
      "type": "decimal",
      "required": true
    },
    "totalAmount": {
      "type": "decimal",
      "required": true
    },
    "currency": {
      "type": "string",
      "required": true,
      "default": "eur"
    },
    "platformFee": {
      "type": "decimal",
      "default": 0
    },
    "stripeFee": {
      "type": "decimal"
    },
    "paymentMethod": {
      "type": "enumeration",
      "enum": ["card", "sepa_debit", "bancontact", "ideal", "giropay", "sofort", "eps", "p24", "other"]
    },
    "paidAt": {
      "type": "datetime"
    },
    "refundedAt": {
      "type": "datetime"
    },
    "refundAmount": {
      "type": "decimal"
    },
    "metadata": {
      "type": "json"
    },
    "items": {
      "type": "component",
      "repeatable": true,
      "component": "order.order-item"
    }
  }
}
```

#### 3.1.4 OrderItem Component

**Location**: `packages/api/src/components/order/order-item.json`

```json
{
  "collectionName": "components_order_order_items",
  "info": {
    "displayName": "Order Item",
    "description": "Individual line items in an order"
  },
  "attributes": {
    "ticket": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::ticket.ticket"
    },
    "ticketName": {
      "type": "string",
      "required": true
    },
    "quantity": {
      "type": "integer",
      "required": true,
      "min": 1
    },
    "unitPrice": {
      "type": "decimal",
      "required": true
    },
    "totalPrice": {
      "type": "decimal",
      "required": true
    },
    "attendeeNames": {
      "type": "json"
    }
  }
}
```

### 3.2 Extended Content Types

#### 3.2.1 Event Extensions

Add to existing Event schema:

```json
{
  "tickets": {
    "type": "relation",
    "relation": "oneToMany",
    "target": "api::ticket.ticket",
    "mappedBy": "event"
  },
  "orders": {
    "type": "relation",
    "relation": "oneToMany",
    "target": "api::order.order",
    "mappedBy": "event"
  },
  "stripeAccount": {
    "type": "relation",
    "relation": "manyToOne",
    "target": "api::stripe-account.stripe-account"
  },
  "ticketingEnabled": {
    "type": "boolean",
    "default": false
  }
}
```

#### 3.2.2 Player Extensions

Add to existing Player schema:

```json
{
  "stripeAccount": {
    "type": "relation",
    "relation": "oneToOne",
    "target": "api::stripe-account.stripe-account",
    "mappedBy": "player"
  },
  "orders": {
    "type": "relation",
    "relation": "oneToMany",
    "target": "api::order.order",
    "mappedBy": "customer"
  }
}
```

---

## 4. API Endpoints

### 4.1 Stripe Connect Routes

**Location**: `packages/api/src/api/stripe/routes/stripe.js`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/stripe/connect/create-account` | Create Express connected account | Host |
| GET | `/api/stripe/connect/onboarding-link` | Get account onboarding URL | Host |
| GET | `/api/stripe/connect/dashboard-link` | Get Express dashboard URL | Host |
| GET | `/api/stripe/connect/account-status` | Get account status | Host |
| DELETE | `/api/stripe/connect/disconnect` | Disconnect Stripe account | Host |

### 4.2 Checkout Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/stripe/checkout/create-session` | Create checkout session | Optional |
| GET | `/api/stripe/checkout/session/:id` | Get session status | Public |

### 4.3 Order Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders` | List user's orders | User |
| GET | `/api/orders/:id` | Get order details | User/Host |
| POST | `/api/orders/:id/refund` | Request refund | Host |

### 4.4 Webhook Route

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/stripe/webhook` | Handle Stripe events | Stripe Signature |

---

## 5. Stripe Integration Details

### 5.1 Connected Account Creation

```typescript
// packages/api/src/api/stripe/services/connect.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createConnectedAccount(player: Player): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: player.location?.country || 'FR', // Default to France
    email: player.user?.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
      sepa_debit_payments: { requested: true }, // Enable SEPA for low fees
    },
    business_type: 'individual', // or 'company' based on host
    metadata: {
      playerId: player.id.toString(),
      platform: 'play14',
    },
  });

  return account;
}

export async function createOnboardingLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}
```

### 5.2 Checkout Session Creation

```typescript
// packages/api/src/api/stripe/services/checkout.ts

interface CreateCheckoutParams {
  event: Event;
  items: Array<{ ticketId: number; quantity: number }>;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: number; // Player ID if logged in
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<Stripe.Checkout.Session> {
  const { event, items, customerEmail, customerName, successUrl, cancelUrl } = params;

  // Get the connected account for this event
  const stripeAccountId = event.stripeAccount?.stripeAccountId;
  if (!stripeAccountId) {
    throw new Error('Event does not have a connected Stripe account');
  }

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let totalAmount = 0;

  for (const item of items) {
    const ticket = await strapi.entityService.findOne('api::ticket.ticket', item.ticketId);
    if (!ticket || !ticket.isActive) {
      throw new Error(`Invalid ticket: ${item.ticketId}`);
    }

    const available = (ticket.quantity ?? Infinity) - (ticket.quantitySold ?? 0);
    if (item.quantity > available) {
      throw new Error(`Not enough tickets available for: ${ticket.name}`);
    }

    lineItems.push({
      price_data: {
        currency: ticket.currency,
        product_data: {
          name: `${event.name} - ${ticket.name}`,
          description: ticket.description || undefined,
          metadata: {
            eventId: event.id.toString(),
            ticketId: ticket.id.toString(),
          },
        },
        unit_amount: Math.round(ticket.priceAmount * 100), // Convert to cents
      },
      quantity: item.quantity,
    });

    totalAmount += ticket.priceAmount * item.quantity;
  }

  // Calculate platform fee (optional - can be 0 for non-profit)
  const platformFeePercent = 0; // 0% platform fee for play14
  const platformFee = Math.round(totalAmount * platformFeePercent);

  // Create order record first
  const orderNumber = generateOrderNumber();
  const order = await strapi.entityService.create('api::order.order', {
    data: {
      orderNumber,
      event: event.id,
      customer: params.customerId,
      customerEmail,
      customerName,
      status: 'pending',
      subtotalAmount: totalAmount,
      totalAmount: totalAmount,
      currency: items[0]?.currency || 'eur',
      platformFee,
      items: items.map(item => ({
        ticket: item.ticketId,
        ticketName: item.ticketName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
      })),
    },
  });

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    line_items: lineItems,
    payment_method_types: [
      'card',
      'sepa_debit',    // Low fees for EU
      'bancontact',    // Belgium
      'ideal',         // Netherlands
      'giropay',       // Germany
      'eps',           // Austria
      'p24',           // Poland
    ],
    success_url: `${successUrl}?order=${orderNumber}`,
    cancel_url: cancelUrl,
    metadata: {
      orderId: order.id.toString(),
      orderNumber,
      eventId: event.id.toString(),
    },
    payment_intent_data: {
      // Send funds directly to connected account
      application_fee_amount: platformFee, // Platform keeps this
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        orderId: order.id.toString(),
        orderNumber,
      },
    },
    // Stripe Tax (optional)
    // automatic_tax: { enabled: true },
  }, {
    stripeAccount: undefined, // Process on platform account, transfer to connected
  });

  // Update order with session ID
  await strapi.entityService.update('api::order.order', order.id, {
    data: {
      stripeCheckoutSessionId: session.id,
    },
  });

  return session;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `P14-${timestamp}-${random}`;
}
```

### 5.3 Webhook Handler

```typescript
// packages/api/src/api/stripe/controllers/webhook.ts

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleWebhook(ctx) {
  const sig = ctx.request.headers['stripe-signature'];
  const rawBody = ctx.request.body[Symbol.for('unparsedBody')] || ctx.request.rawBody;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: `Webhook Error: ${err.message}` };
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    case 'account.updated':
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  ctx.status = 200;
  ctx.body = { received: true };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await strapi.entityService.findOne('api::order.order', orderId, {
    populate: ['items', 'event'],
  });

  if (!order) return;

  // Update order status
  await strapi.entityService.update('api::order.order', orderId, {
    data: {
      status: 'paid',
      stripePaymentIntentId: session.payment_intent as string,
      paymentMethod: mapPaymentMethod(session.payment_method_types?.[0]),
      paidAt: new Date(),
    },
  });

  // Update ticket quantities sold
  for (const item of order.items) {
    if (item.ticket?.id) {
      await strapi.db.query('api::ticket.ticket').update({
        where: { id: item.ticket.id },
        data: {
          quantitySold: strapi.db.connection.raw('quantity_sold + ?', [item.quantity]),
        },
      });
    }
  }

  // Add customer to event players (if logged in)
  if (order.customer?.id) {
    const event = order.event;
    const currentPlayers = event.players?.map(p => p.id) || [];
    if (!currentPlayers.includes(order.customer.id)) {
      await strapi.entityService.update('api::event.event', event.id, {
        data: {
          players: [...currentPlayers, order.customer.id],
        },
      });
    }
  }

  // Send confirmation email (implement separately)
  await sendOrderConfirmationEmail(order);
}

async function handleAccountUpdated(account: Stripe.Account) {
  const stripeAccount = await strapi.db.query('api::stripe-account.stripe-account').findOne({
    where: { stripeAccountId: account.id },
  });

  if (!stripeAccount) return;

  let accountStatus: 'pending' | 'active' | 'restricted' | 'disabled' = 'pending';

  if (account.charges_enabled && account.payouts_enabled) {
    accountStatus = 'active';
  } else if (account.details_submitted) {
    accountStatus = 'restricted';
  }

  await strapi.entityService.update('api::stripe-account.stripe-account', stripeAccount.id, {
    data: {
      accountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingCompleted: account.details_submitted ? new Date() : null,
    },
  });
}
```

---

## 6. Frontend Implementation

### 6.1 TypeScript Types

**Location**: `packages/web/src/models/stripe.ts`

```typescript
export interface StripeAccount {
  id: number;
  stripeAccountId: string;
  accountStatus: 'pending' | 'active' | 'restricted' | 'disabled';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string;
  defaultCurrency: string;
  businessName?: string;
  onboardingCompleted?: string;
}

export interface Ticket {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  priceAmount: number;
  currency: string;
  quantity?: number;
  quantitySold: number;
  maxPerOrder: number;
  salesStart?: string;
  salesEnd?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface OrderItem {
  id: number;
  ticket?: Ticket;
  ticketName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  attendeeNames?: string[];
}

export interface Order {
  id: number;
  documentId: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
  customerEmail: string;
  customerName: string;
  subtotalAmount: number;
  totalAmount: number;
  currency: string;
  platformFee: number;
  stripeFee?: number;
  paymentMethod?: string;
  paidAt?: string;
  items: OrderItem[];
  event?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface CreateCheckoutRequest {
  eventId: number;
  items: Array<{
    ticketId: number;
    quantity: number;
  }>;
  customerEmail: string;
  customerName: string;
}

export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  orderNumber: string;
}
```

### 6.2 Ticket Selection Component

**Location**: `packages/web/src/components/events/ticket-selection.tsx`

```tsx
'use client';

import { useState } from 'react';
import type { Ticket } from '@/models/stripe';
import styles from './ticket-selection.module.scss';

interface TicketSelectionProps {
  tickets: Ticket[];
  eventName: string;
  onCheckout: (items: Array<{ ticketId: number; quantity: number }>) => void;
  isLoading?: boolean;
}

export function TicketSelection({ tickets, eventName, onCheckout, isLoading }: TicketSelectionProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const activeTickets = tickets.filter(t => {
    if (!t.isActive) return false;
    const now = new Date();
    if (t.salesStart && new Date(t.salesStart) > now) return false;
    if (t.salesEnd && new Date(t.salesEnd) < now) return false;
    return true;
  });

  const updateQuantity = (ticketId: number, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [ticketId]: Math.max(0, quantity),
    }));
  };

  const getAvailable = (ticket: Ticket) => {
    if (ticket.quantity === null || ticket.quantity === undefined) return Infinity;
    return ticket.quantity - ticket.quantitySold;
  };

  const getMaxForTicket = (ticket: Ticket) => {
    return Math.min(ticket.maxPerOrder, getAvailable(ticket));
  };

  const totalAmount = activeTickets.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0;
    return sum + ticket.priceAmount * qty;
  }, 0);

  const hasSelection = Object.values(quantities).some(q => q > 0);

  const handleCheckout = () => {
    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketId, quantity]) => ({
        ticketId: parseInt(ticketId),
        quantity,
      }));
    onCheckout(items);
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (activeTickets.length === 0) {
    return (
      <div className={styles.noTickets}>
        <p>No tickets available at this time.</p>
      </div>
    );
  }

  return (
    <div className={styles.ticketSelection}>
      <h3>Select Tickets</h3>

      <div className={styles.ticketList}>
        {activeTickets.map(ticket => {
          const available = getAvailable(ticket);
          const max = getMaxForTicket(ticket);
          const qty = quantities[ticket.id] || 0;
          const isSoldOut = available === 0;

          return (
            <div key={ticket.id} className={styles.ticketRow}>
              <div className={styles.ticketInfo}>
                <h4>{ticket.name}</h4>
                {ticket.description && <p>{ticket.description}</p>}
                <span className={styles.price}>
                  {formatPrice(ticket.priceAmount, ticket.currency)}
                </span>
                {ticket.quantity && (
                  <span className={styles.availability}>
                    {isSoldOut ? 'Sold out' : `${available} remaining`}
                  </span>
                )}
              </div>

              <div className={styles.quantitySelector}>
                <button
                  type="button"
                  onClick={() => updateQuantity(ticket.id, qty - 1)}
                  disabled={qty === 0 || isLoading}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(ticket.id, qty + 1)}
                  disabled={qty >= max || isSoldOut || isLoading}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summary}>
        <div className={styles.total}>
          <span>Total</span>
          <span>{formatPrice(totalAmount, activeTickets[0]?.currency || 'eur')}</span>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={!hasSelection || isLoading}
          className={styles.checkoutButton}
        >
          {isLoading ? 'Processing...' : 'Proceed to Checkout'}
        </button>

        <p className={styles.paymentNote}>
          Pay securely with card, bank transfer, or local payment methods.
          <br />
          <small>SEPA bank payments have lower fees and environmental impact.</small>
        </p>
      </div>
    </div>
  );
}
```

### 6.3 Checkout Server Action

**Location**: `packages/web/src/components/events/checkout.action.ts`

```typescript
'use server';

import type { CreateCheckoutRequest, CreateCheckoutResponse } from '@/models/stripe';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.API_TOKEN;

export async function createCheckoutSession(
  request: CreateCheckoutRequest,
  successUrl: string,
  cancelUrl: string
): Promise<CreateCheckoutResponse> {
  const response = await fetch(`${API_URL}/api/stripe/checkout/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      ...request,
      successUrl,
      cancelUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
}
```

### 6.4 Host Stripe Connect Component

**Location**: `packages/web/src/components/host/stripe-connect.tsx`

```tsx
'use client';

import { useState } from 'react';
import type { StripeAccount } from '@/models/stripe';
import styles from './stripe-connect.module.scss';

interface StripeConnectProps {
  stripeAccount?: StripeAccount;
  onConnect: () => Promise<{ url: string }>;
  onDashboard: () => Promise<{ url: string }>;
}

export function StripeConnect({ stripeAccount, onConnect, onDashboard }: StripeConnectProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { url } = await onConnect();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start Stripe onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDashboard = async () => {
    setIsLoading(true);
    try {
      const { url } = await onDashboard();
      window.open(url, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  if (!stripeAccount) {
    return (
      <div className={styles.connect}>
        <h3>Set Up Payments</h3>
        <p>Connect your Stripe account to receive payments for your events.</p>
        <button onClick={handleConnect} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Connect with Stripe'}
        </button>
      </div>
    );
  }

  const statusBadge = {
    pending: { label: 'Setup Required', color: 'warning' },
    active: { label: 'Active', color: 'success' },
    restricted: { label: 'Restricted', color: 'warning' },
    disabled: { label: 'Disabled', color: 'error' },
  }[stripeAccount.accountStatus];

  return (
    <div className={styles.accountStatus}>
      <h3>Stripe Account</h3>

      <div className={styles.statusRow}>
        <span>Status:</span>
        <span className={`${styles.badge} ${styles[statusBadge.color]}`}>
          {statusBadge.label}
        </span>
      </div>

      {stripeAccount.businessName && (
        <div className={styles.statusRow}>
          <span>Business:</span>
          <span>{stripeAccount.businessName}</span>
        </div>
      )}

      <div className={styles.statusRow}>
        <span>Payments:</span>
        <span>{stripeAccount.chargesEnabled ? 'Enabled' : 'Not enabled'}</span>
      </div>

      <div className={styles.statusRow}>
        <span>Payouts:</span>
        <span>{stripeAccount.payoutsEnabled ? 'Enabled' : 'Not enabled'}</span>
      </div>

      <div className={styles.actions}>
        {stripeAccount.accountStatus === 'pending' && (
          <button onClick={handleConnect} disabled={isLoading}>
            Complete Setup
          </button>
        )}

        <button onClick={handleDashboard} disabled={isLoading} className={styles.secondary}>
          Open Stripe Dashboard
        </button>
      </div>
    </div>
  );
}
```

---

## 7. Environment Configuration

### 7.1 API Environment Variables

**Location**: `packages/api/.env`

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production

# Webhook Secrets (two separate webhooks for platform and connected accounts)
STRIPE_WEBHOOK_SECRET=whsec_...         # Platform account webhook signing secret
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_... # Connected accounts webhook signing secret

# Platform Settings
STRIPE_PLATFORM_FEE_PERCENT=0 # 0% for non-profit
STRIPE_DEFAULT_CURRENCY=eur
```

### 7.2 Web Environment Variables

**Location**: `packages/web/.env`

```bash
# Stripe (public key only - safe for client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 8. Webhook Configuration

### 8.1 Dual Webhook Architecture

The platform uses **two separate webhook endpoints** to handle different event sources:

1. **Platform Account Webhook**: Handles events from direct platform payments
2. **Connected Accounts Webhook**: Handles events from Stripe Connect accounts

Each webhook has its own signing secret for security.

### 8.2 Platform Account Webhook Configuration

**Purpose**: Handle payments made directly to the platform account (standard checkout sessions).

**Stripe Dashboard Configuration**:
- **Endpoint URL**: `https://community-acc.play14.org/api/webhooks/stripe` (production)
- **Events from**: `Your account` (platform account)
- **Events to listen for**:
  - `checkout.session.completed` - Payment successful, create tickets
  - `checkout.session.expired` - Checkout abandoned, release reservations
  - `payment_intent.payment_failed` - Payment failed, notify customer
  - `charge.refunded` - Refund processed, update order status

**Environment Variable**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Platform webhook signing secret
```

### 8.3 Connected Accounts Webhook Configuration

**Purpose**: Handle events from Stripe Connect accounts (host payments and account status).

**Stripe Dashboard Configuration**:
- **Endpoint URL**: `https://community-acc.play14.org/api/webhooks/stripe` (same endpoint!)
- **Events from**: `Connected accounts`
- **Events to listen for**:
  - `account.updated` - Host account status changed (onboarding, capabilities)
  - `checkout.session.completed` - Payment to connected account successful
  - `checkout.session.expired` - Checkout to connected account abandoned
  - `payment_intent.payment_failed` - Payment to connected account failed
  - `charge.refunded` - Refund on connected account

**Environment Variable**:
```bash
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_yyy  # Connect webhook signing secret
```

### 8.4 Webhook Signature Verification

The webhook handler automatically tries both signing secrets:

1. Attempts verification with `STRIPE_WEBHOOK_SECRET` (platform)
2. If that fails, tries `STRIPE_WEBHOOK_SECRET_CONNECT` (connected accounts)
3. If both fail, returns 400 Bad Request with detailed error

**Implementation**: [packages/api/src/services/payment/providers/stripe.ts:223-260](packages/api/src/services/payment/providers/stripe.ts#L223-L260)

### 8.5 Local Development with Stripe CLI

For testing webhooks locally:

```bash
# Start webhook forwarder with Docker Compose
podman-compose up stripe-webhook

# Or manually with Stripe CLI for platform events
stripe listen --forward-to localhost:1337/api/webhooks/stripe \
  --events checkout.session.completed,checkout.session.expired,payment_intent.payment_failed,charge.refunded

# Test specific events
stripe trigger checkout.session.completed
stripe events resend evt_xxx --webhook-endpoint we_xxx
```

### 8.6 Production Webhook URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.play14.org/api/webhooks/stripe` |
| Acceptance | `https://community-acc.play14.org/api/webhooks/stripe` |
| Development | `http://localhost:1337/api/webhooks/stripe` |

### 8.7 Monitoring Webhook Deliveries

**In Stripe Dashboard**:
- Go to Developers → Webhooks
- Click on each webhook endpoint to view delivery logs
- Check for failed deliveries (status codes 4xx/5xx)
- Use "Resend" to retry failed events

**Key Metrics to Monitor**:
- Webhook success rate (should be >99%)
- Response time (should be <2s)
- Failed deliveries by event type
- Signature verification failures

---

## 9. Security Considerations

### 9.1 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| No card data storage | Use Stripe Checkout (hosted) |
| GDPR compliance | Data Processing Agreement with Stripe |
| PCI DSS compliance | Stripe handles all card data |
| Webhook verification | Validate Stripe signatures |
| HTTPS only | Enforce TLS for all endpoints |

### 9.2 Access Control

| Action | Required Role |
|--------|---------------|
| Create Stripe account | Host (event.hosts contains player) |
| View own orders | Authenticated user (order.customer = user) |
| View event orders | Host of that event |
| Issue refunds | Host of that event |
| Admin operations | Strapi admin role |

### 9.3 Rate Limiting

Implement rate limiting on checkout endpoints:
- `POST /stripe/checkout/create-session`: 10 requests per minute per IP
- `POST /stripe/connect/create-account`: 3 requests per hour per user

---

## 10. Testing Strategy

### 10.1 Test Cards

| Scenario | Card Number |
|----------|-------------|
| Successful payment | 4242 4242 4242 4242 |
| Declined | 4000 0000 0000 0002 |
| Requires authentication | 4000 0025 0000 3155 |
| SEPA Direct Debit | AT611904300234573201 |

### 10.2 Test Scenarios

1. **Happy Path**: Complete ticket purchase flow
2. **Account Onboarding**: Host connects Stripe account
3. **Payment Methods**: Test card, SEPA, iDEAL, etc.
4. **Edge Cases**: Sold out tickets, expired sessions, failed payments
5. **Refunds**: Full and partial refund flows
6. **Webhooks**: Simulate all webhook events

### 10.3 Stripe CLI for Local Development

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:1337/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Strapi content types (StripeAccount, Ticket, Order)
- [ ] Install Stripe SDK in both packages
- [ ] Configure environment variables
- [ ] Implement webhook endpoint with signature verification

### Phase 2: Connect Integration (Week 2)
- [ ] Implement connected account creation
- [ ] Build onboarding flow for hosts
- [ ] Handle account.updated webhooks
- [ ] Create host dashboard component

### Phase 3: Checkout Flow (Week 3)
- [ ] Implement checkout session creation
- [ ] Build ticket selection component
- [ ] Handle checkout webhooks
- [ ] Create order confirmation page

### Phase 4: Order Management (Week 4)
- [ ] Build order history views
- [ ] Implement refund functionality
- [ ] Add email notifications
- [ ] Create host order management UI

### Phase 5: Polish & Testing (Week 5)
- [ ] End-to-end testing
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Documentation

---

## 12. Monitoring & Observability

### 12.1 Key Metrics

- Checkout conversion rate
- Payment success rate by method
- Average order value
- Refund rate
- Webhook processing time

### 12.2 Alerts

- Failed webhook deliveries
- High refund rates
- Account restrictions
- Payment failures above threshold

---

## 13. Future Enhancements

1. **Stripe Tax**: Automatic tax calculation and reporting
2. **Subscription Tickets**: Recurring access passes
3. **Promo Codes**: Discount functionality
4. **Waitlist**: For sold-out events
5. **Group Tickets**: Team/organization purchases
6. **Invoice Generation**: PDF invoices for attendees
7. **Carbon Offset**: Integrate Stripe Climate at checkout

---

## Appendix A: Fee Comparison

For a €50 ticket in the EU:

| Payment Method | Stripe Fee | Net to Host |
|----------------|------------|-------------|
| EU Card | €0.95 (1.4% + €0.25) | €49.05 |
| SEPA Direct Debit | €0.65 (0.8% + €0.25, max €6) | €49.35 |
| iDEAL | €0.54 (€0.29 fixed) | €49.46 |
| Bancontact | €0.94 (1.4% + €0.24) | €49.06 |

**Recommendation**: Encourage SEPA/iDEAL for lower fees and environmental impact.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Platform** | play14 (your application) |
| **Connected Account** | Host's Stripe Express account |
| **Direct Charge** | Payment processed on platform, transferred to connected account |
| **Application Fee** | Platform's cut of each transaction (0% for play14) |
| **Payout** | Transfer from Stripe to host's bank account |
