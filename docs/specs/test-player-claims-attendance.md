# Manual Test: Player Claims & Attendance System

## Test ID
`TEST-CLAIM-001`

## Feature
Player profile claiming and event attendance claiming with email notifications

## Related Commits
- `cbb94d5` - feat(api,web): add player claim system with email notifications
- `5f4d82f` - feat(api,web): add claims admin screen for Founders to manage player claims
- `ec56c74` - feat(api,web): add event attendance claim system
- `5020d5d` - feat(api): add attendance-claim permissions to role configs
- `cfb1664` - feat(auth): implement invitation with reset password
- `f08f92e` - refactor(api): migrate emails to React.email and Resend
- `0cd1ec5` - feat(api): sync user role when player is linked via claim or admin

## Prerequisites
- Unlinked player profiles in database
- User accounts without player profiles
- Events with attendee history
- Email service configured (Resend)
- Test email accounts

## Test Environment
- [ ] Local development (with email testing)
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: Discover Claimable Player Profile

### Steps
1. Login with user account that has no player profile
2. Navigate to application
3. System checks for potential profile matches:
   - Email match
   - Name match
4. If match found, prompt or redirect to claim page

### Expected Results
- System identifies potential matches
- User sees notification/prompt
- Link to claim page provided
- Multiple matches handled appropriately

---

## Test Case 2: Claim Own Player Profile

### Steps
1. User without linked player profile logs in
2. Navigate to profile claim page or receive prompt
3. Search for player profile by:
   - Name
   - Email
   - Event attended
4. Select matching profile
5. Click "Claim This Profile"
6. System validates claim
7. Email sent for verification (if required)
8. Confirm claim
9. Verify profile linked to user account

### Expected Results
- Search finds player profiles
- Unlinked profiles displayed
- Claim button visible
- Validation prevents claiming others' profiles
- Email notification sent
- Confirmation link works
- Profile successfully linked
- User role synced based on player position
- Redirect to profile page
- Toast notification shown

### Test Data
```
Player Name: John Doe
Email: john.doe@example.com
Events: Luxembourg 03, Paris 06
```

---

## Test Case 3: Player Claim Email Notification

### Steps
1. Complete player claim (Test Case 2)
2. Check email inbox
3. Verify email received
4. Review email content:
   - Subject line
   - Body text
   - Confirmation link
   - Branding
5. Click confirmation link
6. Verify link destination

### Expected Results
- Email sent immediately via Resend
- React.email template used
- Professional formatting
- Correct recipient
- Clear instructions
- Working confirmation link
- Link expires after use
- Responsive email design

### Email Content Checklist
- [ ] Subject: "Claim Your #play14 Player Profile"
- [ ] Personalized greeting
- [ ] Profile details shown
- [ ] Clear call-to-action button
- [ ] Expiration notice
- [ ] Support contact info
- [ ] Unsubscribe link (if applicable)

---

## Test Case 4: Admin Claims Management - Founder

### Steps
1. Login as Founder
2. Navigate to `/admin/claims`
3. View pending claims
4. Review claim details:
   - User requesting
   - Player profile claimed
   - Timestamp
   - Justification (if provided)
5. Approve claim
6. Verify profile linked
7. Verify email sent to user

### Expected Results
- Claims list accessible to Founders
- All pending claims visible
- Claim details comprehensive
- Approve button works
- Profile linkage successful
- Role synced
- User notified via email
- Claim removed from pending list

---

## Test Case 5: Admin Claims Management - Reject Claim

### Steps
1. Login as Founder
2. Navigate to `/admin/claims`
3. Select pending claim
4. Review claim (suspicious/incorrect)
5. Reject claim
6. Provide rejection reason
7. Verify email sent to user
8. Verify profile remains unlinked

### Expected Results
- Reject button available
- Reason field for rejection
- Rejection email sent
- User notified with reason
- Profile stays unlinked
- Claim marked as rejected
- User can reclaim or contact support

---

## Test Case 6: Claim Duplicate Prevention

### Steps
1. User A claims profile X
2. User B attempts to claim same profile X
3. Verify second claim blocked
4. Attempt to reclaim already linked profile
5. Verify appropriate error message

### Expected Results
- Linked profiles not claimable
- Error message clear
- User B notified profile unavailable
- Alternative suggested (contact support)
- No data corruption

---

## Test Case 7: Event Attendance Claim

### Steps
1. Login as Player
2. Navigate to `/admin/claim-attendance`
3. Search for past events:
   - By name
   - By date
   - By location
4. Select event(s) attended
5. Submit attendance claim
6. Verify claim recorded
7. Wait for organizer approval

### Expected Results
- Attendance claim page accessible
- Event search works
- Only past events shown
- Multiple events selectable
- Claim submission successful
- Pending status visible
- User notified of pending approval

### Test Data
```
Events:
  - Luxembourg 03 (March 2026)
  - Paris 06 (June 2026)
Claimant: player@example.com
```

---

## Test Case 8: Attendance Claim Approval - Organizer

### Steps
1. Login as event Host
2. Navigate to `/admin/attendance-claims`
3. View pending attendance claims for events hosted
4. Review claim details:
   - Player name
   - Event
   - Date claimed
5. Verify attendance (check records)
6. Approve claim
7. Verify player added to event
8. Email sent to player

### Expected Results
- Only relevant claims visible (events hosted)
- Claim details complete
- Approve button works
- Player relation updated:
  - Added to event.players
  - Or event.attended list
- Email confirmation sent
- Claim removed from pending
- Statistics updated

---

## Test Case 9: Attendance Claim Rejection

### Steps
1. Login as event Host
2. View pending attendance claim
3. Determine claim invalid (player didn't attend)
4. Reject claim
5. Provide rejection reason
6. Verify email sent to player
7. Verify player NOT added to event

### Expected Results
- Reject option available
- Reason required
- Rejection email sent
- Player notified
- Event attendance unchanged
- Claim marked rejected
- Player can contact organizer

---

## Test Case 10: Bulk Attendance Claims

### Steps
1. Player attended multiple events
2. Navigate to attendance claim page
3. Select multiple events (5-10)
4. Submit bulk claim
5. Verify all claims recorded
6. Each host receives notification
7. Hosts approve individually
8. Verify all approvals processed

### Expected Results
- Multi-select works
- Bulk submission succeeds
- Individual claims created
- Separate notifications per host
- Independent approval process
- Partial approval possible
- Progress tracking visible

---

## Test Case 11: Invitation with Password Reset

### Steps
1. Admin invites user via email
2. User receives invitation email
3. Click invitation link
4. Redirected to password reset page
5. Set initial password
6. Confirm password
7. Submit form
8. Verify account activated
9. Login with new password

### Expected Results
- Invitation email sent
- Link valid and unique
- Password reset page loads
- Password strength validated
- Account activated after password set
- User can login immediately
- Invitation link expires after use
- Performance measurement tolerates crashes

### Test Data
```
Invited Email: newuser@example.com
Password: SecurePassword123!
```

---

## Test Case 12: Email Migration to React.email and Resend

### Steps
1. Trigger various email events:
   - Player claim confirmation
   - Attendance claim approval
   - Invitation
   - Password reset
2. Verify all emails sent via Resend
3. Check email templates use React.email
4. Verify email formatting
5. Test on multiple email clients

### Expected Results
- All emails use React.email templates
- Sent through Resend API
- Professional HTML formatting
- Responsive design
- Plain text alternative
- Images load correctly
- Links work in all clients
- Spam score acceptable

### Email Clients to Test
- [ ] Gmail (web & mobile)
- [ ] Outlook (web & desktop)
- [ ] Apple Mail (macOS & iOS)
- [ ] Thunderbird

---

## Test Case 13: Role Sync After Claim

### Steps
1. Create player profile with Host position
2. User claims profile
3. Verify user role updated to Host
4. Repeat with Mentor position
5. Verify role updated to Mentor
6. Test permissions after role sync

### Expected Results
- Player position determines user role
- Role synced immediately after claim approval
- Player → Authenticated
- Host → Host role
- Mentor → Mentor role
- Founder → Founder role
- Permissions reflect new role
- Access to role-specific features granted

---

## Test Case 14: Claim Notifications to Multiple Admins

### Steps
1. Submit player claim
2. Verify notification sent to all Founders
3. Submit attendance claim
4. Verify notification sent to event hosts
5. Check notification delivery

### Expected Results
- All relevant admins notified
- Email to each admin
- Admin dashboard shows pending claims
- Notification count badge updated
- Any admin can approve

---

## Test Case 15: Claim History and Audit Trail

### Steps
1. Submit and approve several claims
2. Navigate to claim history (if available)
3. View audit trail:
   - Who claimed
   - When claimed
   - Who approved
   - When approved
4. Filter by status
5. Export history (if available)

### Expected Results
- Complete history visible
- All actions logged
- Timestamps accurate
- Actors identified
- Filterable by status
- Searchable
- Export to CSV works

---

## Test Case 16: Edge Cases - Multiple Events Same Day

### Steps
1. Create player attended 3 events on same day
2. Claim attendance for all 3
3. Verify each claim independent
4. Host approves all
5. Verify statistics correct

### Expected Results
- Each event claim separate
- No duplicate issues
- Statistics count correctly
- All events in history

---

## Test Case 17: Edge Cases - Profile Already Linked

### Steps
1. User with linked profile
2. Attempt to claim another profile
3. Verify blocked with message
4. Attempt to unlink and reclaim
5. Test unlink workflow (if available)

### Expected Results
- Error shown: "You already have a profile"
- Unlink option available (or contact admin)
- Prevent orphaned accounts
- Data integrity maintained

---

## Test Case 18: Email Delivery Failures

### Steps
1. Configure invalid email address
2. Trigger claim notification
3. Monitor email service logs
4. Verify error handling
5. Check retry mechanism
6. Admin notification of failure

### Expected Results
- Failed delivery logged
- Retry attempted (if configured)
- Admin notified of persistent failures
- User informed to update email
- System graceful under failures

---

## Test Case 19: Claim Search and Filtering

### Steps
1. Create multiple claims (player and attendance)
2. Navigate to admin claims page
3. Filter claims:
   - By type (player/attendance)
   - By status (pending/approved/rejected)
   - By date range
   - By user/player
4. Search by name/email
5. Sort results

### Expected Results
- Filters work correctly
- Search matches names/emails
- Sort options available
- Results update dynamically
- Pagination works
- Export filtered results

---

## Test Case 20: Permission-Based Claim Access

### Steps
1. Test claim pages as different roles:
   - Public visitor (should redirect)
   - Player (own claims only)
   - Host (event attendance claims only)
   - Mentor (event attendance claims only)
   - Founder (all claims)
2. Verify appropriate access

### Expected Results
- Public users redirected to login
- Players see own claims interface
- Hosts see attendance claims for their events
- Founders see all claims
- Permissions enforced at API level
- No unauthorized access possible

---

## Performance Checks

### Metrics to Verify
- [ ] Claim submission < 1 second
- [ ] Email sending < 3 seconds
- [ ] Claims list load < 1 second
- [ ] Approval action < 500ms
- [ ] Search results < 300ms

---

## Security Checklist

- [ ] Users can only claim unlinked profiles
- [ ] Email verification required
- [ ] Claim tokens expire
- [ ] CSRF protection on forms
- [ ] Role permissions enforced
- [ ] SQL injection prevented in search
- [ ] XSS prevented in claim reasons
- [ ] Rate limiting on claim submissions
- [ ] Audit trail complete

---

## Email Testing Checklist

- [ ] Email template renders correctly
- [ ] Links work in all clients
- [ ] Images load from CDN
- [ ] Plain text fallback exists
- [ ] Unsubscribe link present
- [ ] Spam score < 5
- [ ] Responsive design works
- [ ] Dark mode compatible

---

## Browser Compatibility

Test on:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge

---

## Accessibility

- [ ] Claim forms accessible
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus management correct
- [ ] Error messages announced
- [ ] Action feedback clear

---

## Notes
- Claims require admin approval for security
- Email notifications use React.email + Resend
- Role synced when profile claimed
- Attendance claims improve event statistics
- Invitation flow includes password reset
- Performance measurement tolerates crashes for invitation emails
