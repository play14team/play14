---
applyTo: "**"
description: "Code review standards and GitHub review guidelines"
---

# Code Review Standards

## Review Process

- All code changes must be reviewed before merging
- Use GitHub's review system with appropriate reviewers
- Require at least one approval before merging
- Address all review comments before merging
- Use draft PRs for work-in-progress code

## What to Review

### Code Quality

- Code follows project standards and conventions
- Logic is clear and well-structured
- Error handling is implemented properly
- Performance considerations are addressed
- Security best practices are followed

### Strapi-Specific Reviews

- Content type schemas are well-designed
- Lifecycle hooks are implemented correctly
- API endpoints follow RESTful conventions
- Database relationships are optimal
- Plugin configurations are appropriate

### Testing

- Tests are included for new functionality
- Test coverage is adequate
- Tests are meaningful and test behavior
- Edge cases are covered
- Integration tests are included where appropriate

### Documentation

- Code is self-documenting with clear naming
- Complex logic is commented appropriately
- README and documentation are updated
- API changes are documented
- Breaking changes are clearly marked

## Review Guidelines

### For Reviewers

- Provide constructive feedback
- Explain the reasoning behind suggestions
- Distinguish between nitpicks and important issues
- Test the changes locally when necessary
- Approve when ready, don't delay unnecessarily

### For Authors

- Respond to all review comments
- Make requested changes or explain why not
- Keep PRs focused and reasonably sized
- Write clear PR descriptions
- Update PRs based on feedback promptly

## Automated Checks

- Ensure CI/CD pipeline passes
- Code linting and formatting checks pass
- Security scans complete successfully
- Test suite runs successfully
- Build process completes without errors

## Merge Strategies

- Use squash and merge for feature branches
- Use merge commits for important milestones
- Write clear commit messages
- Maintain linear history where possible
- Tag releases appropriately

## Common Review Checklist

- [ ] Code follows project conventions
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Tests included and passing
- [ ] Documentation updated
- [ ] No hardcoded secrets or sensitive data
- [ ] Error handling implemented
- [ ] Breaking changes documented
- [ ] Database migrations included if needed
- [ ] Environment variables documented

## Review Etiquette

- Be respectful and professional
- Focus on code, not the person
- Explain suggestions with examples
- Acknowledge good practices
- Learn from reviews - both giving and receiving
