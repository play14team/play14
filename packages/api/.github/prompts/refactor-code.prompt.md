---
mode: "agent"
description: "Refactor code to improve maintainability, performance, and best practices"
tools: ["edit/editFiles", "search", "codebase", "runTests"]
---

# Refactor Code

Your goal is to refactor existing code to improve maintainability, performance, readability, and adherence to Strapi 5 best practices while preserving functionality.

## Refactoring Principles

### Code Quality Improvements

- Extract complex logic into smaller, focused functions
- Remove code duplication (DRY principle)
- Improve naming conventions for clarity
- Simplify complex conditional logic
- Remove dead or unused code

### Strapi 5 Best Practices

- Move business logic from controllers to services
- Optimize database queries and relationships
- Improve lifecycle hook implementations
- Enhance error handling and validation
- Better plugin and middleware organization

### Performance Optimizations

- Reduce database query complexity
- Implement proper caching strategies
- Optimize file handling and uploads
- Improve memory usage patterns
- Add pagination where needed

## Refactoring Process

### 1. Analysis Phase

- Identify code smells and anti-patterns
- Analyze performance bottlenecks
- Review test coverage
- Check for security vulnerabilities
- Assess maintainability issues

### 2. Planning Phase

- Prioritize refactoring goals
- Identify breaking changes
- Plan backward compatibility
- Design new structure
- Consider migration strategies

### 3. Implementation Phase

- Make incremental changes
- Maintain functionality during refactoring
- Update tests as needed
- Document changes
- Verify performance improvements

## Common Refactoring Patterns

### Extract Service Method

Move complex logic from controllers to services:

```javascript
// Before: Controller with business logic
async create(ctx) {
  const { data } = ctx.request.body;
  // Complex validation and processing logic
  const result = await strapi.entityService.create('api::event.event', { data });
  return result;
}

// After: Thin controller, logic in service
async create(ctx) {
  const { data } = ctx.request.body;
  return await strapi.service('api::event.event').create(data);
}
```

### Optimize Database Queries

```javascript
// Before: N+1 query problem
const events = await strapi.entityService.findMany("api::event.event");
for (const event of events) {
  event.venue = await strapi.entityService.findOne(
    "api::venue.venue",
    event.venue.id,
  );
}

// After: Single query with populate
const events = await strapi.entityService.findMany("api::event.event", {
  populate: ["venue"],
});
```

### Extract Configuration

```javascript
// Before: Hardcoded values
const maxFileSize = 5 * 1024 * 1024; // 5MB
const allowedTypes = ["image/jpeg", "image/png"];

// After: Configuration-driven
const config = strapi.config.get("upload");
const maxFileSize = config.maxFileSize;
const allowedTypes = config.allowedTypes;
```

## Refactoring Targets

### Controllers

- Keep controllers thin and focused
- Move business logic to services
- Improve error handling
- Standardize response formats

### Services

- Extract reusable business logic
- Improve query efficiency
- Add proper error handling
- Implement caching where appropriate

### Models/Schemas

- Optimize relationships
- Add proper validations
- Improve field configurations
- Enhance schema documentation

### Utilities

- Extract common functionality
- Improve error handling
- Add type checking
- Enhance reusability

## Testing During Refactoring

### Maintain Test Coverage

- Run tests before refactoring
- Update tests as code changes
- Add tests for new functionality
- Ensure all tests pass after refactoring

### Integration Testing

- Test API endpoints still work
- Verify database operations
- Check authentication flows
- Validate error handling

## Refactoring Guidelines

### Safety First

- Make small, incremental changes
- Run tests frequently
- Keep git history clean
- Have rollback plans ready

### Preserve Functionality

- Don't change external APIs without versioning
- Maintain backward compatibility where possible
- Document breaking changes
- Provide migration guides

### Documentation

- Update code comments
- Revise API documentation
- Update README files
- Document architectural changes

Provide the code you'd like me to refactor, and I'll improve it while maintaining functionality and following best practices!
