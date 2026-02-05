# Email Testing Scripts

## Test All Email Templates

Send all 11 email templates to a test email address to verify they render correctly.

### Quick Start

```bash
# Set your Sender.net API key
export SENDER_API_KEY=your_api_key_here

# Run the test script
bun run test:emails
```

### What Gets Sent

The script sends 11 test emails to `cedric.pontet+test@gmail.com`:

1. **Player Claim New** - Admin notification when player claim submitted
2. **Player Claim Approved** - User notification when claim approved
3. **Player Claim Rejected** - User notification when claim rejected
4. **Attendance Claim New** - Organizer notification when attendance claimed
5. **Attendance Claim Approved** - Player notification when attendance approved
6. **Attendance Claim Rejected** - Player notification when attendance rejected
7. **Ticket Confirmation** - Order confirmation with tickets
8. **Ticket Order Refund** - Refund notification
9. **Player Invitation** - New player invitation with ticket
10. **Payment Failed** - Payment failure notification
11. **Ticket Sold Notification** - Organizer notification when a ticket order completes

### Filter to One Template

You can send a single template using a filter (works with `test:emails`):

```bash
# CLI arg
bun --filter play14-api test:emails -- --only=ticket-sold-notification

# Env var
EMAIL_TEMPLATE=ticket-sold-notification bun --filter play14-api test:emails
```

### Configuration

Edit [test-emails-simple.ts](test-emails-simple.ts) to customize:

```typescript
const TEST_EMAIL = "cedric.pontet+test@gmail.com"  // Change recipient
const FROM_EMAIL = process.env.EMAIL_DEFAULT_FROM || "noreply@play14.org"
```

### Environment Variables

Required:
- `SENDER_API_KEY` - Your Sender.net API key

Optional:
- `EMAIL_DEFAULT_FROM` - From email address (defaults to noreply@play14.org)

### Example Output

```
🚀 Starting email template testing...
📧 Sending emails to: cedric.pontet+test@gmail.com
📤 From: noreply@play14.org

1️⃣  Sending: Player Claim New (Admin Notification)
   ✅ Sent!

2️⃣  Sending: Player Claim Approved
   ✅ Sent!

...

📊 Summary:
   ✅ Successfully sent: 11/11

📧 Check your inbox at: cedric.pontet+test@gmail.com

🎉 Test completed successfully!
```

## Troubleshooting

### Error: SENDER_API_KEY environment variable is required

Set your Sender.net API key:
```bash
export SENDER_API_KEY=your_api_key_here
```

### Emails not arriving

1. Check spam folder
2. Verify the email address in the script
3. Check Sender.net dashboard for delivery status
4. Ensure API key has correct permissions

### Rate limiting

The script includes a 500ms delay between emails to avoid rate limiting. If you still hit limits, increase the delay in [test-emails-simple.ts](test-emails-simple.ts):

```typescript
await new Promise((resolve) => setTimeout(resolve, 1000)) // Increase to 1 second
```

## Why There Are Two Scripts

- `scripts/test-emails-simple.ts` sends email templates directly through Sender.net and does not boot Strapi. It is fast, requires only `SENDER_API_KEY`, and is what `test:emails` runs.
- `scripts/test-emails.ts` boots Strapi and uses the configured email provider via `strapi.plugin("email")`. It validates the Strapi email configuration and provider integration.
