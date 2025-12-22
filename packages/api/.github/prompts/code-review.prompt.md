---
mode: "agent"
description: "Perform thorough code review with actionable feedback"
tools: ["edit/editFiles", "search", "codebase", "problems"]
---

# Code Review Assistant

Your goal is to perform a comprehensive code review focusing on code quality, security, performance, and Strapi 5 best practices.

## Review Checklist

### Code Quality

- [ ] Code follows project naming conventions
- [ ] Logic is clear and well-structured
- [ ] Functions are focused and single-purpose
- [ ] Error handling is implemented properly
- [ ] Code is DRY (Don't Repeat Yourself)

### Strapi 5 Specific

- [ ] Content type schemas are well-designed
- [ ] Lifecycle hooks are implemented correctly
- [ ] API endpoints follow RESTful conventions
- [ ] Services contain business logic, controllers are thin
- [ ] Plugin configurations are appropriate
- [ ] Database relationships are optimal

### Security Review

- [ ] Input validation is implemented
- [ ] No hardcoded secrets or sensitive data
- [ ] Authentication/authorization properly implemented
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention measures
- [ ] CORS configuration is appropriate

### Performance Considerations

- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Proper pagination implemented
- [ ] Caching strategies considered
- [ ] Memory usage is efficient

### Testing

- [ ] Tests are included for new functionality
- [ ] Test coverage is adequate
- [ ] Tests are meaningful and test behavior
- [ ] Edge cases are covered
- [ ] Integration tests included where appropriate

## Review Process

### 1. Analyze the Code

- Review the overall structure and architecture
- Check for compliance with project standards
- Identify potential issues or improvements
- Look for code smells and anti-patterns

### 2. Security Assessment

- Check for common security vulnerabilities
- Verify input validation and sanitization
- Review authentication and authorization logic
- Check for sensitive data exposure

### 3. Performance Analysis

- Review database operations and queries
- Check for potential bottlenecks
- Analyze memory usage patterns
- Review caching strategies

### 4. Provide Feedback

- Categorize issues by severity (Critical, High, Medium, Low)
- Provide specific examples and suggestions
- Explain the reasoning behind recommendations
- Offer alternative approaches where applicable

## Feedback Format

### Critical Issues

Issues that must be fixed before merging:

- Security vulnerabilities
- Data corruption risks
- Breaking changes without migration

### High Priority Issues

Important improvements that should be addressed:

- Performance problems
- Maintainability concerns
- Missing error handling

### Medium Priority Issues

Good improvements to consider:

- Code style consistency
- Better naming conventions
- Documentation improvements

### Low Priority Issues

Nice-to-have improvements:

- Minor optimizations
- Code organization suggestions
- Additional test coverage

## Common Issues to Look For

### Strapi Patterns

- Incorrect use of lifecycle hooks
- Missing input validation
- Improper error handling
- Inefficient database queries
- Wrong HTTP status codes

### JavaScript/Node.js

- Memory leaks
- Blocking operations
- Improper async/await usage
- Missing error boundaries
- Insecure dependencies

### API Design

- Inconsistent endpoint naming
- Missing pagination
- Improper HTTP methods
- Missing rate limiting
- Inadequate error responses

Provide the code you'd like me to review, and I'll give you detailed, actionable feedback!
