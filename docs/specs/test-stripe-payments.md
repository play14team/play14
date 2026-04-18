# Manual Test: Stripe Payment & Ticketing

## Test ID
`TEST-STRIPE-001`

## Feature
Stripe Connect payment integration for event ticketing

## Related Commits
- `c0c9687` - feat(api,web): add ticketing system with Stripe payment integration
- `f82c53d` - feat(api,web): add Stripe Connect for host payment accounts
- `44aea88` - feat(api,web): implement Stripe webhook handling and improve ticket purchase UX
- `7ddf349` - feat(api,web): add discount codes and auth-required ticket purchases
- `35bfc02` - feat(api,web): add revenue analytics dashboard to finance tab
- `4bfef35` - feat(api): add webhook handlers for expired/failed payments and deployment docs
- `7bbc54f` - feat(api,web): add attendee info collection and fix ticket purchase bugs
- `0d87929` - feat(api,web): add ticketingMode field and fix admin form improvements
- `1a47cd1` - fix(api): address security concerns in Stripe webhook and payment flow
- `11ae2d4` - fix(api): resolve critical ticketing issues for free orders, idempotency, and security
- `125f41e` - fix(api): address critical ticketing security and consistency issues
- `3123fa6` - feat(api): implement event-level idempotency for Stripe webhooks
- `486d7d4` - feat(api): implement ticket reservation system to prevent overselling
- `b4757ef` - fix(web): use environment variables for Stripe redirect URLs
- `7cedd4b` - fix(web): prevent UI flicker when enabling/disabling payments
- `3e0bf3b` - feat(web): add drag-and-drop ticket type ordering

## Prerequisites
- Stripe account with Connect enabled
- Stripe API keys configured in environment
- Stripe webhook endpoint configured
- Stripe CLI installed for local testing
- Test payment methods (cards, SEPA, etc.)

## Test Environment
- [ ] Local development (with Stripe CLI)
- [ ] Acceptance environment
- [ ] Production environment (test mode)

---

## Test Case 1: Stripe Connect Account Onboarding

### Steps
1. Login as a Host or organizer
2. Navigate to `/admin/profile` or Stripe settings
3. Click "Connect with Stripe" button
4. Complete Stripe Express onboarding flow:
   - Business details
   - Identity verification
   - Bank account details
5. Return to application after onboarding
6. Verify account status

### Expected Results
- Stripe Connect button is visible for Hosts
- Onboarding flow opens in new window/redirect
- Account status shows "pending" during verification
- Account status changes to "active" when approved
- Charges and payouts are enabled
- Dashboard link is available

### Test Data
```
Business Type: Individual
Country: France (or user's country)
Email: host email address
```

### Verification Points
- [ ] Account created in Stripe dashboard
- [ ] Account ID stored in database
- [ ] Webhook received for account.updated
- [ ] Account status synced correctly

---

## Test Case 2: Event Ticketing Configuration

### Steps
1. Login as event Host
2. Navigate to event editor
3. Select "Finance" tab
4. Enable ticketing
5. Select ticketing mode (Internal/External)
6. For Internal ticketing:
   - Select Stripe account
   - Create ticket types
7. Configure ticket details:
   - Name, description
   - Price and currency
   - Quantity available
   - Sales start/end dates
   - Max per order
8. Save changes

### Expected Results
- Ticketing toggle works without UI flicker
- Internal/External toggle visible
- Stripe account dropdown populated
- Ticket form validates correctly
- Multiple ticket types can be created
- Tickets can be reordered via drag-and-drop
- Changes saved successfully

### Test Data
```json
{
  "ticketTypes": [
    {
      "name": "Early Bird",
      "price": 50.00,
      "currency": "EUR",
      "quantity": 20,
      "maxPerOrder": 2
    },
    {
      "name": "Regular",
      "price": 75.00,
      "currency": "EUR",
      "quantity": 50,
      "maxPerOrder": 5
    }
  ]
}
```

---

## Test Case 3: Free Ticket Purchase

### Steps
1. Navigate to event page with free tickets
2. Select quantity of free tickets
3. Fill in attendee information
4. Submit order
5. Verify order confirmation

### Expected Results
- Free tickets don't show payment UI
- Attendee info is collected
- Order is created with status "paid"
- No Stripe session is created
- Order confirmation is displayed
- User is added to event attendees
- Confirmation email sent

### Test Data
```
Event: Test event with free tickets
Ticket: Free admission (€0.00)
Quantity: 2
```

### Security Checks
- [ ] Free order security validations passed
- [ ] Idempotency prevents duplicate orders
- [ ] Quantity validated server-side

---

## Test Case 4: Paid Ticket Purchase - Card Payment

### Steps
1. Navigate to event with paid tickets
2. Select ticket quantities
3. Click "Proceed to Checkout"
4. If not logged in, enter email and name
5. Redirected to Stripe Checkout
6. Enter test card: `4242 4242 4242 4242`
7. Complete payment
8. Redirected to success page

### Expected Results
- Ticket selection calculates total correctly
- Checkout button enabled when selection made
- Stripe Checkout session created
- Redirect to Stripe hosted page
- Payment successful
- Redirect to `/events/[slug]/tickets/success`
- Order status updated to "paid"
- Tickets marked as sold
- User added to event attendees
- Confirmation email sent

### Test Data
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

---

## Test Case 5: Alternative Payment Methods

### Steps
Test each payment method:

**SEPA Direct Debit:**
1. Select SEPA at checkout
2. Enter IBAN: `DE89370400440532013000`
3. Confirm mandate
4. Complete payment

**iDEAL (Netherlands):**
1. Select iDEAL at checkout
2. Choose test bank
3. Authorize payment

**Bancontact (Belgium):**
1. Select Bancontact
2. Complete authorization

### Expected Results
- All configured payment methods available
- Each method completes successfully
- Lower fees for SEPA/iDEAL shown
- Payment method recorded in order
- Environmental note shown for bank transfers

### Test Data
- SEPA IBAN: `AT611904300234573201`
- Various test accounts per payment method

---

## Test Case 6: Discount Code Application

### Steps
1. Navigate to event with discount codes
2. Select tickets
3. Enter discount code
4. Verify discount applied
5. Complete purchase
6. Verify final amount

### Expected Results
- Discount code field visible
- Valid codes apply discount
- Invalid codes show error
- Discount reflected in total
- Order records discount used
- Discount limits enforced

### Test Data
```
Code: EARLYBIRD25
Type: Percentage
Value: 25%
Min Purchase: €50
Max Uses: 100
```

### Negative Tests
- Expired code - should error
- Already used code (single use) - should error
- Code below minimum purchase - should error

---

## Test Case 7: Ticket Quantity Limits

### Steps
1. Navigate to event with limited tickets
2. Attempt to purchase more than available
3. Attempt to purchase more than max per order
4. Complete successful purchase within limits
5. Verify quantity decremented

### Expected Results
- Quantity selector limited by availability
- Max per order enforced
- "Sold Out" shown when quantity = 0
- Remaining tickets displayed
- Reservation system prevents overselling
- Concurrent purchases handled correctly

### Test Data
```
Ticket: Limited ticket (10 available)
Max Per Order: 3
Test: Multiple users purchasing simultaneously
```

---

## Test Case 8: Attendee Information Collection

### Steps
1. Select multiple tickets (e.g., 3)
2. Proceed to checkout
3. Fill in attendee names for each ticket
4. Complete purchase
5. Verify attendee data stored

### Expected Results
- Attendee name fields shown per ticket
- All fields required for submission
- Attendee data saved with order
- Host can view attendee list
- Attendee names shown in order details

### Test Data
```
Ticket Quantity: 3
Attendees:
  - Alice Smith
  - Bob Johnson
  - Carol Williams
```

---

## Test Case 9: Stripe Webhook Handling

### Steps
Using Stripe CLI:

1. Start webhook listener:
   ```bash
   stripe listen --forward-to localhost:1337/api/webhooks/stripe
   ```

2. Trigger events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger payment_intent.succeeded
   stripe trigger payment_intent.payment_failed
   stripe trigger checkout.session.expired
   stripe trigger account.updated
   ```

3. Verify webhook processing in logs
4. Check order status updates

### Expected Results
- All webhooks received and verified
- Signature validation passes
- Event-level idempotency prevents duplicates
- Order status updated correctly
- Ticket quantities updated
- Failed payments logged
- Account status synced

### Webhook Events to Test
- [ ] checkout.session.completed
- [ ] checkout.session.expired
- [ ] payment_intent.succeeded
- [ ] payment_intent.payment_failed
- [ ] charge.refunded
- [ ] account.updated
- [ ] account.application.deauthorized

---

## Test Case 10: Failed Payment Handling

### Steps
1. Use declined test card: `4000 0000 0000 0002`
2. Attempt payment
3. Verify failure handling
4. Check order status
5. Retry with successful card

### Expected Results
- Payment fails gracefully
- User sees error message
- Order status remains "pending" or "failed"
- User can retry payment
- Webhook handled correctly
- No duplicate orders created

### Test Cards for Failures
- Declined: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`
- Processing error: `4000 0000 0000 0119`

---

## Test Case 11: Session Expiration

### Steps
1. Start checkout process
2. Wait for session expiration (default 24 hours, can be shortened for testing)
3. Verify expired session handling
4. Start new checkout

### Expected Results
- Expired sessions can't be completed
- Webhook received for session.expired
- Order marked as expired/cancelled
- Ticket reservation released
- User can create new checkout

---

## Test Case 12: Order Cancellation

### Steps
1. Complete a ticket purchase
2. Navigate to order details (as user or host)
3. Request cancellation/refund
4. Process refund (host action)
5. Verify refund status

### Expected Results
- Order status shows "paid"
- Refund option available (if within policy)
- Refund processed in Stripe
- Order status updated to "refunded"
- Ticket quantity restored
- Refund confirmation sent
- Finance dashboard updated

### Test Data
```
Order: Recently completed
Amount: €50.00
Refund: Full refund
```

---

## Test Case 13: Revenue Analytics Dashboard

### Steps
1. Login as event Host
2. Navigate to event Finance tab
3. View revenue analytics
4. Check metrics:
   - Total revenue
   - Tickets sold
   - Payment method breakdown
   - Revenue per ticket type
   - Platform fees
   - Stripe fees

### Expected Results
- Dashboard displays correct totals
- Charts render correctly
- Data updates after new orders
- Export functionality works (if available)
- Date range filtering works
- Currency displayed correctly

---

## Test Case 14: Authenticated Purchase Requirement

### Steps
1. Configure event to require authentication
2. Log out
3. Attempt to purchase tickets
4. Verify redirect to login
5. Login and complete purchase

### Expected Results
- Anonymous users redirected to login
- User can return to checkout after login
- Purchase completes successfully
- User linked to order correctly

---

## Test Case 15: External Ticketing Mode

### Steps
1. Configure event with external ticketing
2. Add external ticketing URL
3. View event page
4. Verify external link displayed
5. Click link
6. Verify redirect to external platform

### Expected Results
- External ticketing URL saved
- Internal ticketing disabled
- External link shown on event page
- Link opens in new tab
- No Stripe integration active

### Test Data
```
External URL: https://eventbrite.com/event/12345
```

---

## Test Case 16: Ticket Reservation System

### Steps
1. Start checkout for last 2 tickets
2. In separate browser, start checkout for same tickets
3. Both try to complete purchase
4. Verify only one succeeds

### Expected Results
- Reservation prevents overselling
- First completion succeeds
- Second gets "sold out" error
- Reservations expire after timeout
- No race conditions

### Test Data
```
Event: Test event with 2 tickets remaining
Users: UserA and UserB (concurrent)
```

---

## Test Case 17: Multi-Currency Support

### Steps
1. Create tickets in different currencies:
   - EUR
   - USD
   - GBP
   - CHF
2. Purchase each ticket type
3. Verify correct currency handling

### Expected Results
- All Stripe-supported currencies available
- Prices displayed in correct currency
- Stripe Checkout uses correct currency
- Payment processed in ticket currency
- Revenue dashboard shows multi-currency correctly

### Currencies to Test
- EUR, USD, GBP, CHF, DKK, NOK, SEK, PLN, CZK

---

## Test Case 18: Drag-and-Drop Ticket Ordering

### Steps
1. Navigate to event Finance tab
2. Create multiple ticket types
3. Drag ticket type to reorder
4. Save changes
5. View public event page
6. Verify ticket order matches

### Expected Results
- Drag-and-drop interface works smoothly
- Order persists after save
- Public page reflects new order
- Sort order field updated correctly

---

## Test Case 19: Environment Variable Configuration

### Steps
1. Verify Stripe environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PLATFORM_FEE_PERCENT`
2. Verify redirect URLs use environment variables
3. Test in different environments

### Expected Results
- Variables loaded correctly
- Different keys for dev/acc/prod
- Webhook secrets unique per environment
- Redirect URLs configurable
- No hardcoded URLs in code

---

## Test Case 20: Stripe Dashboard Integration

### Steps
1. Login as Host with connected account
2. Navigate to Stripe settings
3. Click "Open Stripe Dashboard"
4. Verify Express dashboard opens
5. View payouts, transactions, disputes

### Expected Results
- Dashboard link generated correctly
- Opens in new tab
- User authenticated automatically
- Shows account-specific data
- All Express features accessible

---

## Security Testing

### Security Checklist
- [ ] Webhook signature validation
- [ ] Idempotency keys prevent duplicates
- [ ] Order tampering prevented
- [ ] Price manipulation prevented
- [ ] Quantity validation server-side
- [ ] CORS properly configured
- [ ] HTML sanitization for user inputs
- [ ] Rate limiting on checkout
- [ ] HTTPS enforced
- [ ] Secrets not exposed in logs

### Test Attack Scenarios
1. Modify price in checkout request
2. Purchase more tickets than allowed
3. Replay webhook events
4. Manipulate discount codes
5. Access other users' orders

---

## Performance Testing

### Metrics to Verify
- [ ] Checkout creation < 1 second
- [ ] Webhook processing < 500ms
- [ ] Order retrieval < 200ms
- [ ] Revenue dashboard < 2 seconds
- [ ] Concurrent purchases handled

### Load Testing
- Simulate 10 concurrent purchases
- Verify no overselling occurs
- Check database locks
- Monitor API response times

---

## Error Handling

### Scenarios to Test
1. Stripe API timeout
2. Network interruption during payment
3. Invalid Stripe account
4. Webhook delivery failure
5. Database connection error
6. Invalid ticket configuration

### Expected Behavior
- Graceful error messages
- Retry logic for webhooks
- Transaction rollback on failure
- User can retry safely
- Errors captured in application logs

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Form labels correct
- [ ] Error messages announced
- [ ] Payment iframe accessible

---

## Notes
- Stripe CLI required for local webhook testing
- Use Stripe test mode for all manual testing
- Webhook endpoint must be publicly accessible for production
- Platform fee is 0% for #play14 (non-profit)
- SEPA payments encouraged for lower fees
