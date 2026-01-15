# Invoice Generation System

## Overview

The platform now generates professional PDF invoices for all ticket purchases using PDFKit. Invoices are automatically attached to confirmation emails sent to purchasers.

## Technology Stack

- **PDFKit**: Lightweight PDF generation library (2.9 KB output)
- **Node.js Streams**: Buffer-based PDF generation for container compatibility
- **TypeScript**: Full type safety with `@types/pdfkit`

## Features

### Invoice Design

The invoice includes:

1. **Header Section**
   - Organization name and branding
   - Organization contact details (address, email, website, tax ID)
   - Invoice number and date
   - Order number reference

2. **Bill To Section**
   - Purchaser name and email
   - Event details (name, date, location) in highlighted box

3. **Items Table**
   - Ticket type descriptions with quantities
   - Unit prices and totals
   - Alternating row colors for readability
   - Professional table headers with brand colors

4. **Totals Section**
   - Subtotal
   - Discount amount (if applicable)
   - Grand total with "PAID" status
   - Payment method (e.g., Stripe)

5. **Footer**
   - Thank you message
   - Generation timestamp
   - Professional styling

### Brand Integration

- **Primary Color**: `#f47920` (#play14 orange)
- **Dark Color**: `#1a1a1a`
- **Gray Colors**: `#666666`, `#f5f5f5`
- **Typography**: Helvetica family (standard PDF fonts)

## Implementation

### Core Library

**File**: `packages/api/src/libs/invoice.ts`

```typescript
export async function generateInvoicePDF(
  data: InvoiceData,
  options: InvoiceOptions = {}
): Promise<Buffer>
```

**Key Functions**:
- `generateInvoicePDF()`: Main invoice generation function
- `formatTicketItems()`: Helper to format ticket details for invoice

### Webhook Integration

**File**: `packages/api/src/api/ticket-order/controllers/webhook.ts`

Invoice generation is integrated into the `handleCheckoutCompleted` workflow:

1. Payment confirmed via Stripe webhook
2. Tickets created and reservations confirmed
3. **Invoice PDF generated** with order details
4. Confirmation email sent with invoice attached

### Email Attachments

Confirmation emails now include:
- **Calendar file** (`.ics`) - Event reminder
- **Invoice PDF** (`invoice-{orderNumber}.pdf`) - Payment receipt

## Usage

### Automatic Generation

Invoices are automatically generated and sent when:
- Stripe checkout session completes successfully
- Order status changes to "paid"
- Confirmation email is sent to purchaser

### Manual Generation (Script)

Generate a sample invoice for testing:

```bash
cd packages/api
bun run src/scripts/generate-sample-invoice.ts
```

Output: `packages/api/sample-invoice.pdf`

## Testing

### Unit Tests

**File**: `packages/api/src/libs/invoice.test.ts`

Run tests:
```bash
cd packages/api
bun test src/libs/invoice.test.ts
```

Tests cover:
- ✓ PDF buffer generation
- ✓ PDF format validation (magic number)
- ✓ Ticket item formatting
- ✓ Invoices with/without discounts
- ✓ Invoices with notes
- ✓ Organization details

## Configuration

### Environment Variables

Invoice generation uses existing environment variables:

- `FRONTEND_URL`: Link to platform (default: `https://play14.org`)
- Event contact email from event record

### Organization Details

Configure in webhook controller ([webhook.ts:1042-1046](packages/api/src/api/ticket-order/controllers/webhook.ts#L1042-L1046)):

```typescript
const invoiceOptions = {
  organizationName: "#play14",
  organizationWebsite: "https://play14.org",
  organizationEmail: order.event.contactEmail || "contact@play14.org",
  // Optional:
  // organizationAddress: "...",
  // taxId: "...",
}
```

## Error Handling

Invoice generation is **non-critical**:

- If PDF generation fails, the email is still sent without invoice
- Error is logged for monitoring: `[Webhook] Failed to generate invoice PDF`
- Order processing continues successfully
- Purchaser still receives ticket codes and calendar file

## File Size

- Average invoice: ~2.9 KB
- Efficient for email attachments
- No external dependencies or images required

## Future Enhancements

Potential improvements:

1. **Logo Integration**: Add #play14 logo to invoice header
2. **Tax Support**: Add VAT/GST calculations for applicable regions
3. **Custom Numbering**: Separate invoice numbering system (currently uses order number)
4. **Multi-language**: Support for invoices in multiple languages
5. **Admin Regeneration**: UI to regenerate/resend invoices from admin panel
6. **Storage**: Store invoices in Strapi media library for later access

## Related Files

- [packages/api/src/libs/invoice.ts](../packages/api/src/libs/invoice.ts) - Invoice generation library
- [packages/api/src/libs/invoice.test.ts](../packages/api/src/libs/invoice.test.ts) - Unit tests
- [packages/api/src/api/ticket-order/controllers/webhook.ts](../packages/api/src/api/ticket-order/controllers/webhook.ts) - Webhook integration
- [packages/api/src/scripts/generate-sample-invoice.ts](../packages/api/src/scripts/generate-sample-invoice.ts) - Sample generator script

## Dependencies

```json
{
  "pdfkit": "0.17.2",
  "@types/pdfkit": "0.17.4"
}
```

PDFKit is production-ready and container-friendly (no Puppeteer/Playwright overhead).
