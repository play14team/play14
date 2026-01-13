# Email Testing Scripts

## Test All Email Templates

Send all 10 email templates to a test email address to verify they render correctly.

### Quick Start

```bash
# Set your Resend API key
export RESEND_API_KEY=re_your_api_key_here

# Run the test script
bun run test:emails
```

### What Gets Sent

The script sends 10 test emails to `cedric.pontet+test@gmail.com`:

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

### Configuration

Edit [test-emails-simple.ts](test-emails-simple.ts:11) to customize:

```typescript
const TEST_EMAIL = "cedric.pontet+test@gmail.com"  // Change recipient
const FROM_EMAIL = process.env.RESEND_DEFAULT_FROM || "onboarding@resend.dev"
```

### Environment Variables

Required:
- `RESEND_API_KEY` - Your Resend API key

Optional:
- `RESEND_DEFAULT_FROM` - From email address (defaults to onboarding@resend.dev)

### Example Output

```
🚀 Starting email template testing...
📧 Sending all emails to: cedric.pontet+test@gmail.com
📤 From: onboarding@resend.dev

1️⃣  Sending: Player Claim New (Admin Notification)
   ✅ Sent! (ID: abc123...)

2️⃣  Sending: Player Claim Approved
   ✅ Sent! (ID: def456...)

...

📊 Summary:
   ✅ Successfully sent: 10/10

📧 Check your inbox at: cedric.pontet+test@gmail.com

🎉 Test completed successfully!
```

## Troubleshooting

### Error: RESEND_API_KEY environment variable is required

Set your Resend API key:
```bash
export RESEND_API_KEY=re_your_api_key_here
```

### Emails not arriving

1. Check spam folder
2. Verify the email address in the script
3. Check Resend dashboard for delivery status
4. Ensure API key has correct permissions

### Rate limiting

The script includes a 500ms delay between emails to avoid rate limiting. If you still hit limits, increase the delay in [test-emails-simple.ts](test-emails-simple.ts:269):

```typescript
await new Promise((resolve) => setTimeout(resolve, 1000)) // Increase to 1 second
```
