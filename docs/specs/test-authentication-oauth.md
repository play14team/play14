# Manual Test: Authentication & OAuth

## Test ID
`TEST-AUTH-001`

## Feature
Multi-provider OAuth authentication with username/password fallback

## Related Commits
- `664846f` - feat(auth): make sign-in button discreet and add multi-provider OAuth support
- `1239b04` - feat(web): add username/password login and registration
- `16e8ab5` - fix(api): migrate LinkedIn OAuth to OpenID Connect scopes
- `ccf9ae1` - fix(api,web): update session management and improve security settings for OAuth
- `738b7a6` - fix(api): enable proxy trust in production for OAuth secure cookies
- `42b699c` - fix(web): resolve OAuth redirect using internal container URL
- `ab402b6` - feat(web): add feature flag to control login button visibility
- `1f6bf57` - fix(web): apply login feature flag to client component and remove debug logs

## Prerequisites
- Application deployed and accessible
- OAuth providers configured (LinkedIn, GitHub, Google, etc.)
- Test user accounts for each OAuth provider
- Email service configured for password reset

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: OAuth Login - LinkedIn

### Steps
1. Navigate to the login page
2. Click on "Sign in with LinkedIn" button
3. Authorize the application on LinkedIn
4. Verify redirect back to application

### Expected Results
- User is redirected to LinkedIn authorization page
- After authorization, user is redirected back to `/admin` page
- User session is created with secure cookies
- User profile is populated with LinkedIn data
- Session persists across page refreshes

### Test Data
- LinkedIn account with public profile

### Notes
- Verify OAuth callback URL uses internal container URL in production
- Check that session cookies are secure with `httpOnly` and `sameSite` flags
- Verify proxy trust is enabled in production for correct redirect URLs

---

## Test Case 2: OAuth Login - Multiple Providers

### Steps
1. Navigate to login page
2. Verify all OAuth provider buttons are visible
3. Test login with each provider:
   - LinkedIn
   - GitHub
   - Google
   - Any other configured providers

### Expected Results
- All OAuth buttons are displayed correctly
- Each provider redirects to correct authorization page
- Successful login for each provider
- User profile is created/updated with provider data
- User can switch between providers for same account

### Test Data
- Accounts for each OAuth provider

---

## Test Case 3: Username/Password Registration

### Steps
1. Navigate to `/auth/register`
2. Fill in registration form:
   - Email address
   - Password (minimum 8 characters)
   - Confirm password
3. Submit the form
4. Verify email confirmation (if applicable)
5. Verify redirect to dashboard

### Expected Results
- Registration form validates input correctly
- Password strength indicator works
- Passwords must match
- User account is created in database
- User is automatically logged in after registration
- Welcome email is sent (if configured)

### Test Data
```
Email: test-user-{timestamp}@example.com
Password: TestPassword123!
```

### Negative Tests
- Empty fields - should show validation errors
- Invalid email format - should show error
- Password too short - should show error
- Passwords don't match - should show error
- Email already exists - should show error

---

## Test Case 4: Username/Password Login

### Steps
1. Navigate to `/auth/login`
2. Fill in login form:
   - Email address
   - Password
3. Click "Sign in" button
4. Verify redirect to dashboard

### Expected Results
- Login form validates input
- Successful login with correct credentials
- User session is created
- Redirect to `/admin` page
- Session persists across browser refresh

### Test Data
Use account created in Test Case 3

### Negative Tests
- Wrong password - should show error message
- Non-existent email - should show error message
- Empty fields - should show validation errors

---

## Test Case 5: Password Reset Flow

### Steps
1. Navigate to `/auth/reset-password`
2. Enter email address
3. Submit form
4. Check email inbox for reset link
5. Click reset link
6. Enter new password
7. Confirm new password
8. Submit form
9. Login with new password

### Expected Results
- Reset email is sent to user
- Reset link is valid and unique
- Reset link expires after use
- Password is updated successfully
- User can login with new password
- Old password no longer works

### Test Data
```
Email: existing user email
New Password: NewTestPassword456!
```

### Negative Tests
- Invalid email - should show error
- Expired reset link - should show error
- Reset link used twice - should show error

---

## Test Case 6: Login Feature Flag

### Steps
1. Set feature flag to disable login button
2. Navigate to login page
3. Verify login button visibility
4. Set feature flag to enable login button
5. Refresh page
6. Verify login button is now visible

### Expected Results
- When feature flag is disabled, login button is hidden
- When feature flag is enabled, login button is visible
- Feature flag applies to both server and client components
- No console errors related to feature flag

### Configuration
Check environment variable or feature flag system for login button visibility setting

---

## Test Case 7: Session Management

### Steps
1. Login to the application
2. Verify session cookie is set
3. Close browser
4. Reopen browser and navigate to protected page
5. Verify session persistence
6. Wait for session timeout (if configured)
7. Try to access protected page
8. Verify redirect to login

### Expected Results
- Session cookie is secure (`httpOnly`, `secure`, `sameSite`)
- Session persists across browser sessions (if configured)
- Session expires after timeout period
- Expired session redirects to login page
- Session data is properly encrypted

### Notes
- Check session middleware configuration
- Verify proxy trust settings in production

---

## Test Case 8: OAuth Redirect Security

### Steps
1. Start OAuth login flow
2. Intercept OAuth callback
3. Verify redirect URL structure
4. Check for open redirect vulnerabilities
5. Verify state parameter validation

### Expected Results
- Redirect URLs are validated against whitelist
- State parameter prevents CSRF attacks
- No open redirect vulnerabilities
- Internal container URLs are used correctly in production
- External URLs work correctly for OAuth providers

### Security Checks
- [ ] Validate redirect URI
- [ ] Check state parameter
- [ ] Verify HTTPS enforcement
- [ ] Check for timing attacks

---

## Test Case 9: Authentication Errors

### Steps
1. Test OAuth flow with denied authorization
2. Test OAuth flow with invalid state
3. Test OAuth flow with expired authorization
4. Navigate to `/auth/error`
5. Verify error messages are user-friendly

### Expected Results
- User is redirected to `/auth/error` page
- Error message is clear and actionable
- User can navigate back to login
- Error is logged for debugging
- No sensitive information in error messages

---

## Test Case 10: Multi-Device Login

### Steps
1. Login on Device A (desktop browser)
2. Login on Device B (mobile browser)
3. Verify both sessions are active
4. Logout on Device A
5. Verify session on Device B is still active
6. Logout on Device B
7. Verify all sessions are terminated

### Expected Results
- Multiple concurrent sessions are supported
- Logout on one device doesn't affect others
- User can see all active sessions (if implemented)
- User can terminate all sessions remotely

---

## Test Case 11: No Player Profile Error

### Steps
1. Create OAuth account without player profile
2. Login successfully
3. Navigate to `/auth/no-player`
4. Verify error message and instructions

### Expected Results
- User is redirected to `/auth/no-player` page
- Clear message explaining the issue
- Instructions on how to resolve (contact admin, etc.)
- User session is still valid

---

## Performance Checks

### Metrics to Verify
- [ ] Login response time < 2 seconds
- [ ] OAuth redirect time < 3 seconds
- [ ] Session validation < 100ms
- [ ] No memory leaks in session storage
- [ ] Rate limiting on login attempts (after security fixes)

---

## Security Checklist

- [ ] Passwords are hashed with bcrypt/argon2
- [ ] Session tokens are cryptographically secure
- [ ] HTTPS enforced for all auth endpoints
- [ ] CSRF protection on all forms
- [ ] OAuth state parameter validated
- [ ] Redirect URLs validated
- [ ] Rate limiting on login attempts
- [ ] Account lockout after failed attempts
- [ ] Secure cookie flags set
- [ ] No sensitive data in logs

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility

- [ ] Login form is keyboard accessible
- [ ] Screen reader compatible
- [ ] Proper ARIA labels
- [ ] Focus management
- [ ] Error messages are announced

---

## Notes
- OAuth callback URLs must be configured in each provider's console
- LinkedIn OAuth uses OpenID Connect scopes (updated from legacy)
- Session management improved for reverse proxy deployments
- Feature flag system controls login button visibility
