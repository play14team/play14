# Manual Test: Security & Observability

## Test ID
`TEST-SEC-001`

## Feature
Security validations, error tracking, metrics, and monitoring

## Related Commits
- `161d2f1` - fix(api): add security validations for CORS, webhooks, and HTML sanitization
- `9a074d4` - fix(web,api): address CodeQL security vulnerabilities
- `722db3c` - fix(api,ci): address CodeQL security alerts
- `e26a905` - fix(web,api): migrate all fetch calls to strapiFetch and fix security issues
- `a045fcc` - feat: add error tracking and Prometheus metrics for observability
- `2c84216` - feat(api): use strapi-prometheus plugin
- `55a9088` - fix(api): ensure 5xx errors are logged even when handled by Strapi
- `bcbc6fc` - feat(api): add configurable CORS and expand rate limiting coverage
- `74e8ec7` - fix(api): address security issues with rate limiting and secure randomness
- `16a1a3f` - fix(api): use cryptographically secure random IDs in test factories
- `0573502` - fix(api): improve webhook logging and CORS security documentation

## Prerequisites
- Access to Prometheus/Grafana (if configured)
- Access to application logs (Clever Cloud `clever logs`, local stdout)
- Security testing tools (OWASP ZAP, Burp Suite)
- Valid and invalid test data
- Admin access for configuration

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: CORS Configuration

### Steps
1. Configure CORS settings in environment
2. Test allowed origins:
   - Frontend domain
   - Admin domain
   - Mobile app (if applicable)
3. Test rejected origins:
   - Random domains
   - Null origin
   - Localhost (in production)
4. Test preflight requests (OPTIONS)
5. Verify CORS headers in responses

### Expected Results
- Only configured origins allowed
- Credentials allowed for trusted origins
- Appropriate headers set:
  - Access-Control-Allow-Origin
  - Access-Control-Allow-Methods
  - Access-Control-Allow-Headers
  - Access-Control-Max-Age
- Preflight requests handled
- Rejected origins return 403
- Documentation in code comments

### Test Requests
```bash
# Allowed origin
curl -H "Origin: https://play14.org" https://api.play14.org/api/events

# Disallowed origin
curl -H "Origin: https://malicious.com" https://api.play14.org/api/events
```

### Configuration to Verify
```javascript
// config/middlewares.js
cors: {
  origin: [
    'https://play14.org',
    'https://api.play14.org',
    /\.play14\.org$/
  ],
  credentials: true
}
```

---

## Test Case 2: Rate Limiting

### Steps
1. Identify rate-limited endpoints:
   - Login
   - Registration
   - Password reset
   - Ticket purchase
   - API endpoints
2. Test rate limits:
   - Send requests within limit
   - Exceed limit
   - Verify 429 response
3. Test different rate limit tiers:
   - Anonymous users
   - Authenticated users
   - Admin users
4. Test rate limit reset

### Expected Results
- Rate limits enforced per IP/user
- Different limits for different endpoints
- 429 Too Many Requests returned
- Retry-After header included
- Rate limit resets after time window
- Cryptographically secure tokens used

### Rate Limits to Test
```
Login: 5 attempts per 15 minutes
Registration: 3 per hour per IP
Checkout: 10 per minute per user
API: 100 requests per minute
```

### Test Script
```bash
# Exceed login rate limit
for i in {1..10}; do
  curl -X POST https://api.play14.org/api/auth/local \
    -d '{"identifier":"test@example.com","password":"wrong"}' \
    -H "Content-Type: application/json"
done
```

---

## Test Case 3: SQL Injection Prevention

### Steps
1. Test all search/filter endpoints
2. Inject SQL payloads:
   - `' OR '1'='1`
   - `'; DROP TABLE users; --`
   - `1' UNION SELECT * FROM users--`
3. Test in:
   - Login forms
   - Search boxes
   - Filter parameters
   - Sort parameters
4. Verify queries use parameterization
5. Check CodeQL alerts resolved

### Expected Results
- All inputs sanitized
- Parameterized queries used
- ORM (Strapi) protects against injection
- No SQL errors exposed
- Invalid inputs rejected gracefully
- CodeQL scans clean

### Vulnerable Parameters to Test
```
?search='OR'1'='1
?filters[name][$contains]='; DROP TABLE--
?sort=id); DROP TABLE users;--
```

---

## Test Case 4: XSS (Cross-Site Scripting) Prevention

### Steps
1. Test XSS in various contexts:
   - Event descriptions (WYSIWYG)
   - Player bios
   - Comments/feedback
   - Profile fields
   - Search queries
2. Inject XSS payloads:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
   - `<svg onload=alert('XSS')>`
   - JavaScript in URLs
3. Verify HTML sanitization
4. Test both stored and reflected XSS

### Expected Results
- All user input sanitized
- HTML sanitization configured:
  - DOMPurify used
  - Whitelist approach
  - Script tags stripped
  - Event handlers removed
- Output encoded
- Content Security Policy enforced
- No XSS vulnerabilities

### CSP Headers to Verify
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' cdn.play14.org;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' api.play14.org;
```

---

## Test Case 5: CSRF Protection

### Steps
1. Identify state-changing operations:
   - Login
   - Form submissions
   - Profile updates
   - Payments
   - Admin actions
2. Test without CSRF token
3. Test with invalid token
4. Test with expired token
5. Verify token validation

### Expected Results
- CSRF tokens required for POST/PUT/DELETE
- Tokens validated server-side
- Invalid tokens rejected (403)
- Tokens tied to user session
- Tokens expire appropriately
- Same-site cookies used

---

## Test Case 6: Authentication Security

### Steps
1. Test password requirements:
   - Minimum length (8 chars)
   - Complexity requirements
   - Common password rejection
2. Test password hashing:
   - Verify bcrypt/argon2 used
   - Check hash in database
3. Test session security:
   - Session cookies secure
   - HttpOnly flag set
   - SameSite flag set
   - Session timeout
4. Test account lockout after failed attempts

### Expected Results
- Passwords hashed (bcrypt/argon2)
- No plaintext passwords stored
- Strong password policy enforced
- Session cookies secure:
  - `Secure` flag (HTTPS only)
  - `HttpOnly` (no JS access)
  - `SameSite=Lax` or `Strict`
- Account lockout after 5 failed attempts
- JWT secrets strong and rotated

### Password Tests
```
Weak: "password" - should reject
Weak: "12345678" - should reject
Strong: "MyS3cure!Pass2026" - should accept
```

---

## Test Case 7: Authorization & Access Control

### Steps
1. Test as different user roles:
   - Anonymous
   - Player
   - Host
   - Mentor
   - Founder
2. Attempt unauthorized actions:
   - Edit others' events
   - Delete others' profiles
   - Access admin pages
   - View private data
   - Approve claims (non-Founder)
3. Verify role-based permissions

### Expected Results
- All endpoints check authorization
- Role hierarchy enforced:
  - Player < Host < Mentor < Founder
- Permission bootstrap system works
- 403 Forbidden for unauthorized
- No horizontal privilege escalation
- No vertical privilege escalation
- Permission checks at API level (not just UI)

### Unauthorized Action Tests
```
# Player attempting admin action
GET /api/admin/claims
Expected: 403 Forbidden

# Host editing other's event
PUT /api/events/{other-host-event}
Expected: 403 Forbidden
```

---

## Test Case 8: File Upload Security

### Steps
1. Test file upload endpoints:
   - Avatar upload
   - Event images
   - Venue logos
2. Test malicious files:
   - PHP files
   - Executable files
   - Files with double extensions (image.jpg.php)
   - SVG with embedded scripts
   - Zip bombs
   - Oversized files
3. Verify file type validation
4. Check file size limits
5. Test path traversal in filenames

### Expected Results
- File type whitelist enforced
- Magic number validation (not just extension)
- File size limits enforced (5MB)
- Uploaded files stored securely
- Filenames sanitized
- No path traversal possible
- SVG sanitization
- Files served with correct Content-Type
- No execution permissions on upload directory

### Malicious File Tests
```
- shell.php.jpg (double extension)
- ../../../../etc/passwd (path traversal)
- image.svg with <script> tag
- 10GB.jpg (size limit test)
```

---

## Test Case 9: Webhook Security

### Steps
1. Test Stripe webhook endpoint
2. Send webhook without signature
3. Send webhook with invalid signature
4. Send webhook with expired signature
5. Verify idempotency
6. Test replay attacks

### Expected Results
- Signature validation required
- Invalid signatures rejected (400/401)
- Idempotency keys prevent duplicates
- Event-level idempotency implemented
- Replay attacks prevented
- Webhook logs secured
- Sensitive data not logged

### Webhook Tests
```bash
# Send webhook without signature
curl -X POST https://api.play14.org/api/webhooks/stripe \
  -d '{"type":"checkout.session.completed"}'

# Expected: 400 Bad Request

# Send webhook with invalid signature
curl -X POST https://api.play14.org/api/webhooks/stripe \
  -H "Stripe-Signature: invalid" \
  -d '{"type":"checkout.session.completed"}'

# Expected: 400 Bad Request
```

---

## Test Case 10: Error Logging

### Steps
1. Trigger various errors:
   - 404 Not Found
   - 500 Internal Server Error
   - JavaScript errors
   - API errors
   - Database errors
2. Check application logs (Clever Cloud `clever logs -f` in production,
   stdout locally) for each error
3. Verify error captured with:
   - Stack trace
   - Request context / correlation ID
   - Relevant identifiers (orderId, eventId, etc.)

### Expected Results
- All errors captured in structured logs via `strapi.log.error` / `createLogger`
- Handled errors reported (5xx even when handled)
- No sensitive data (tokens, secrets, PII) in error logs
- Correlation IDs propagated so related log entries can be correlated

---

## Test Case 11: Prometheus Metrics

### Steps
1. Access Prometheus metrics endpoint:
   - `/metrics` (if public)
   - Or via admin endpoint
2. Verify metrics collected:
   - HTTP request duration
   - Request count by endpoint
   - Error rates
   - Database query time
   - Ticket sales
   - Active users
3. Test metrics in Grafana dashboards
4. Configure alerts

### Expected Results
- Metrics endpoint accessible
- Strapi-Prometheus plugin active
- Standard metrics collected:
  - `http_request_duration_ms`
  - `http_requests_total`
  - `http_request_errors_total`
  - `db_query_duration_ms`
  - `active_sessions`
- Custom metrics for business logic:
  - `ticket_sales_total`
  - `checkout_completions`
  - `event_registrations`
- Metrics formatted for Prometheus
- Grafana dashboards configured
- Alerts for anomalies

### Metrics to Check
```
# HTTP request duration histogram
http_request_duration_ms{method="GET",route="/api/events",status="200"}

# Total requests counter
http_requests_total{method="POST",route="/api/checkout"}

# Error rate
rate(http_request_errors_total[5m])
```

---

## Test Case 12: Secrets Management

### Steps
1. Review environment configuration
2. Verify secrets not in code
3. Check .env.example for placeholders
4. Verify secrets in CI/CD
5. Test secret rotation
6. Check secret exposure in logs
7. Verify secret exposure in error messages

### Expected Results
- All secrets in environment variables
- No secrets in git repository
- .env.example has placeholders
- Secrets injected in CI/CD
- No secrets in logs
- No secrets in error messages
- No secrets in client-side code
- Secret rotation supported

### Secrets to Verify
```
✓ STRIPE_SECRET_KEY (env)
✓ DATABASE_PASSWORD (env)
✓ JWT_SECRET (env)
✗ STRIPE_SECRET_KEY="sk_test_..." (hardcoded - bad)
```

---

## Test Case 13: HTTPS Enforcement

### Steps
1. Test HTTP connections (production)
2. Verify redirect to HTTPS
3. Check HSTS headers
4. Verify certificate validity
5. Test certificate chain
6. Check TLS version

### Expected Results
- HTTP redirects to HTTPS (301/302)
- HSTS header present:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Valid SSL certificate
- TLS 1.2+ required
- Strong ciphers only
- Certificate not expired
- No mixed content warnings

### HSTS Header
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Test Case 14: Content Security Policy (CSP)

### Steps
1. Check CSP headers in responses
2. Test CSP violations:
   - Inline scripts
   - External scripts from untrusted domains
   - Inline styles
3. Verify CSP reports
4. Check browser console for CSP errors

### Expected Results
- CSP header present
- Restrictive policy:
  - `default-src 'self'`
  - `script-src` whitelist
  - `style-src` whitelist
  - No `unsafe-eval`
- CSP reports configured
- Violations logged
- Gradual CSP deployment (report-only → enforcing)

### CSP Header Example
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.play14.org https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.play14.org;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

---

## Test Case 15: API Security Headers

### Steps
1. Make API requests
2. Verify security headers in responses:
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection (legacy)
   - Referrer-Policy
   - Permissions-Policy
3. Check for information disclosure headers

### Expected Results
- Security headers present:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  ```
- No version disclosure:
  - No `X-Powered-By: Express`
  - No `Server: Strapi/5.0.0`
- No stack traces in production errors
- No debug information leaked

---

## Test Case 16: Dependency Vulnerabilities

### Steps
1. Run security audit:
   ```bash
   bun audit
   npm audit
   ```
2. Check for known vulnerabilities
3. Review dependency updates
4. Test with outdated dependencies
5. Verify automated security updates

### Expected Results
- No critical vulnerabilities
- No high vulnerabilities
- Medium/low vulnerabilities documented
- Regular dependency updates
- Dependabot/Renovate configured
- Automated security patches
- Lockfile committed

---

## Test Case 17: Database Security

### Steps
1. Verify database connection:
   - SSL/TLS enforced
   - Strong credentials
   - Restricted access
2. Test database injection (covered in Test Case 3)
3. Verify data encryption at rest
4. Check backup encryption
5. Test access control

### Expected Results
- SSL/TLS required for database connections
- Strong passwords enforced
- Database not publicly accessible
- Principle of least privilege
- Sensitive data encrypted (passwords, tokens)
- Backups encrypted
- Regular security patches

---

## Test Case 18: Logging and Audit Trails

### Steps
1. Trigger various actions:
   - Login
   - Profile edit
   - Event creation
   - Payment
   - Admin actions
2. Check logs
3. Verify audit trail
4. Test log retention
5. Verify no sensitive data logged

### Expected Results
- Actions logged with context:
  - User ID
  - Action type
  - Timestamp
  - IP address
  - User agent
- No sensitive data in logs:
  - No passwords
  - No credit cards
  - No API keys
- Logs retained appropriately
- Log rotation configured
- Logs accessible to admins
- Logs protected from tampering

---

## Test Case 19: Incident Response

### Steps
1. Simulate security incident
2. Verify detection:
   - Prometheus alerts
   - Log monitoring / log-based alerts
3. Test notification system
4. Verify incident documentation
5. Test recovery procedures

### Expected Results
- Incidents detected quickly
- Alerts sent to team
- Clear escalation path
- Incident response plan documented
- Logging sufficient for forensics
- Rollback procedures tested
- Communication plan defined

---

## Test Case 20: Privacy & GDPR Compliance

### Steps
1. Review data collection
2. Test data export (user)
3. Test data deletion (GDPR right to erasure)
4. Verify consent mechanisms
5. Check privacy policy
6. Test cookie consent
7. Verify data minimization

### Expected Results
- Privacy policy accessible
- Cookie consent banner
- Users can export their data
- Users can delete their account
- Data deletion cascades correctly
- Consent recorded
- Data minimization practiced
- No unnecessary data collected
- Data retention policies defined
- DPA with third parties (Stripe, etc.)

---

## Security Testing Tools

### Recommended Tools
- [ ] OWASP ZAP - Web vulnerability scanner
- [ ] Burp Suite - Penetration testing
- [ ] Nmap - Network scanner
- [ ] SQLMap - SQL injection testing
- [ ] Lighthouse - Security audit
- [ ] CodeQL - Static code analysis
- [ ] Snyk - Dependency scanning

---

## Observability Dashboard Checks

### Metrics to Monitor
- [ ] Request rate (req/min)
- [ ] Error rate (errors/min)
- [ ] Response time (p50, p95, p99)
- [ ] Database query time
- [ ] API endpoint latency
- [ ] Ticket sales conversion rate
- [ ] User registration rate
- [ ] Active sessions
- [ ] Payment success rate

### Alerts to Configure
- [ ] High error rate (>5% for 5 min)
- [ ] Slow response time (>2s p95)
- [ ] Database connection pool exhausted
- [ ] High memory usage (>90%)
- [ ] High CPU usage (>80%)
- [ ] Disk space low (<10%)
- [ ] Failed payment rate high
- [ ] Webhook delivery failures

---

## Penetration Testing Checklist

- [ ] SQL Injection
- [ ] XSS (Stored, Reflected, DOM-based)
- [ ] CSRF
- [ ] Authentication bypass
- [ ] Authorization bypass
- [ ] Session hijacking
- [ ] File upload vulnerabilities
- [ ] Path traversal
- [ ] Command injection
- [ ] XML/XXE attacks
- [ ] SSRF (Server-Side Request Forgery)
- [ ] Open redirects
- [ ] Sensitive data exposure
- [ ] Broken access control
- [ ] Security misconfiguration

---

## Notes
- Security is a continuous process
- Regular security audits required
- CodeQL scans run in CI/CD
- Structured logging captures all errors including handled 5xx
- Prometheus metrics for real-time monitoring
- CORS configured per environment
- Rate limiting uses cryptographically secure tokens
- HTML sanitization uses DOMPurify
- All fetch calls migrated to strapiFetch for security
- Webhook logging improved with security in mind
