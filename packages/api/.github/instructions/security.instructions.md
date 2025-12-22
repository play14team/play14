## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/security-and-owasp.instructions.md -->

applyTo: '\*'
description: 'Security best practices based on OWASP Top 10 and Strapi-specific security guidelines'

---

# Security Best Practices and OWASP Guidelines

## Strapi Security Configuration

- Use Strapi's built-in authentication and authorization mechanisms
- Configure proper CORS settings in `config/middlewares.js`
- Implement Content Security Policy (CSP) headers
- Use HTTPS in production environments
- Keep Strapi and all dependencies updated

## A01: Broken Access Control

- Enforce principle of least privilege in role definitions
- Use Strapi's role-based access control (RBAC) properly
- Validate user permissions on every API request
- Implement proper field-level permissions
- Never rely on client-side access control checks

## A02: Cryptographic Failures

- Use strong, modern algorithms for password hashing (bcrypt, Argon2)
- Store sensitive configuration in environment variables
- Never hardcode secrets, API keys, or connection strings
- Use HTTPS for all data transmission
- Encrypt sensitive data at rest

```javascript
// GOOD: Load from environment
const apiKey = process.env.API_KEY;

// BAD: Hardcoded secret
const apiKey = "sk_this_is_a_very_bad_idea_12345";
```

## A03: Injection Attacks

- Use Strapi's built-in query methods that prevent SQL injection
- Validate and sanitize all input data
- Use parameterized queries for any custom database operations
- Prevent NoSQL injection in MongoDB queries
- Sanitize data before storing in database

## A05: Security Misconfiguration

- Disable debug mode in production
- Configure proper error handling to avoid information disclosure
- Set secure HTTP headers (HSTS, X-Content-Type-Options, etc.)
- Use environment-specific configurations
- Regular security audits with dependency scanning tools (npm audit, Snyk, etc.)

## A06: Vulnerable Components

- Keep all dependencies updated
- Use tools like Snyk or npm audit to check for vulnerabilities
- Review dependency security before adding new packages
- Remove unused dependencies regularly
- Monitor security advisories for critical dependencies

## A07: Authentication Failures

- Implement proper session management
- Use secure session cookies (HttpOnly, Secure, SameSite)
- Implement rate limiting for authentication endpoints
- Use strong password policies
- Implement account lockout mechanisms

## A08: Software and Data Integrity Failures

- Validate all data before processing
- Use digital signatures for critical data
- Implement proper backup and recovery procedures
- Validate uploads and file types
- Use checksum verification for important files

## Input Validation

- Validate all input data at the API boundary
- Use Strapi's built-in validation mechanisms
- Implement custom validators for complex business rules
- Sanitize data to prevent XSS attacks
- Validate file uploads thoroughly

## API Security

- Implement proper authentication for all API endpoints
- Use API rate limiting to prevent abuse
- Log security-relevant events
- Implement proper error handling without information disclosure
- Use API versioning for backward compatibility

## Database Security

- Use connection pooling and prepared statements
- Implement proper database user permissions
- Enable database logging and monitoring
- Use database encryption for sensitive data
- Regular database security updates

## File Upload Security

- Validate file types and sizes
- Scan uploaded files for malware
- Store uploads outside the web root
- Use proper file naming conventions
- Implement virus scanning for uploads

## General Security Guidelines

- Be explicit about security measures in code comments
- Educate team members about security best practices
- Implement security testing in CI/CD pipeline
- Regular security code reviews
- Follow the principle of defense in depth
