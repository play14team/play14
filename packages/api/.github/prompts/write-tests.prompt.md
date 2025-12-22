## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/prompts/javascript-typescript-jest.prompt.md -->

mode: 'agent'  
description: 'Generate comprehensive tests for Strapi 5 API components'
tools: ['edit/editFiles', 'search', 'codebase', 'runTests']

---

# Write Tests

Your goal is to generate comprehensive tests for the Strapi 5 API, including unit tests, integration tests, and API endpoint tests.

## Test Types to Generate

### 1. Unit Tests

- Test individual functions and services
- Test lifecycle hooks
- Test utility functions
- Test custom validators

### 2. Integration Tests

- Test API endpoints with database
- Test content type operations
- Test plugin functionality
- Test authentication flows

### 3. Service Tests

- Test custom services
- Test business logic
- Test data transformations
- Test external API integrations

## Test Structure Requirements

### File Naming

- Use `.test.js` suffix for test files
- Place tests next to source files or in `__tests__` directory
- Use descriptive test file names

### Test Organization

```javascript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should do something specific", () => {
      // Test implementation
    });

    it("should handle error cases", () => {
      // Error handling test
    });
  });
});
```

## Strapi-Specific Testing Patterns

### Content Type Tests

- Test CRUD operations
- Test field validations
- Test relationships
- Test lifecycle hooks

### API Endpoint Tests

```javascript
describe("GET /api/events", () => {
  it("should return paginated events", async () => {
    const response = await request(strapi.server.httpServer)
      .get("/api/events")
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

### Service Tests

```javascript
describe("EventService", () => {
  it("should create event with slug", async () => {
    const eventData = { name: "Test Event", start: "2024-01-01" };
    const result = await strapi
      .service("api::event.event")
      .create({ data: eventData });

    expect(result.slug).toBe("test-event-01");
  });
});
```

## Mock Strategies

### External Dependencies

- Mock external API calls
- Mock file system operations
- Mock email services
- Mock payment gateways

### Database Mocking

- Use test database for integration tests
- Mock database operations for unit tests
- Use factories for test data generation
- Clean up test data after each test

## Test Data Management

### Factories

Create data factories for consistent test data:

```javascript
const createTestEvent = (overrides = {}) => ({
  name: "Test Event",
  description: "Test Description",
  start: "2024-01-01T10:00:00Z",
  end: "2024-01-01T18:00:00Z",
  ...overrides,
});
```

### Fixtures

Use fixture files for complex test data scenarios.

## Common Test Patterns

### Testing Async Code

```javascript
it("should handle async operations", async () => {
  const result = await someAsyncFunction();
  expect(result).resolves.toBe(expectedValue);
});
```

### Testing Errors

```javascript
it("should throw error for invalid input", async () => {
  await expect(functionThatShouldThrow()).rejects.toThrow(
    "Expected error message",
  );
});
```

### Testing Authentication

```javascript
it("should require authentication", async () => {
  const response = await request(strapi.server.httpServer)
    .get("/api/protected-endpoint")
    .expect(401);
});
```

## Coverage Requirements

- Aim for high coverage on business logic
- Test both success and error paths
- Include edge cases and boundary conditions
- Test permission and authorization logic
- Cover validation and sanitization logic

Provide the code or component you'd like me to test, and I'll generate comprehensive test coverage!
