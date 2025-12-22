## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/nodejs-javascript-vitest.instructions.md -->

applyTo: '**/\*.test.js, **/_.spec.js, \*\*/_.test.ts, \*_/_.spec.ts'
description: 'Testing standards and practices for the Strapi 5 API'

---

# Testing Standards and Best Practices

## Testing Framework

- Use Jest for unit and integration testing
- Write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- Never change original code to make it easier to test - write tests that cover the original code as it is

## Test Structure

- Name test files with `.test.js` suffix
- Place test files next to the code they test or in a dedicated `__tests__` directory
- Use descriptive test names that explain the expected behavior
- Use nested describe blocks to organize related tests
- Follow the pattern: `describe('Component/Function/Service', () => { it('should do something', () => {}) })`

## Strapi Testing Patterns

- Test content type schemas and validations
- Test lifecycle hooks behavior
- Test custom routes and controllers
- Test services and business logic
- Test plugin functionality

## Effective Mocking

- Mock external dependencies (APIs, databases, etc.) to isolate tests
- Use `jest.mock()` for module-level mocks
- Use `jest.spyOn()` for specific function mocks
- Use `mockImplementation()` or `mockReturnValue()` to define mock behavior
- Reset mocks between tests with `jest.resetAllMocks()` in `afterEach`

## Testing Async Code

- Always return promises or use async/await syntax in tests
- Use `resolves`/`rejects` matchers for promises
- Set appropriate timeouts for slow tests with `jest.setTimeout()`

## Integration Testing

- Test complete API endpoints
- Test database operations with test database
- Test authentication and authorization flows
- Use supertest for HTTP testing

## Test Data Management

- Use factories or fixtures for test data
- Clean up test data after each test
- Use transaction rollbacks for database tests
- Avoid dependencies between tests

## Coverage Requirements

- Aim for high test coverage on critical business logic
- Focus on testing behavior, not implementation details
- Include error scenarios and edge cases
- Test both success and failure paths

## Common Jest Matchers

- Basic: `expect(value).toBe(expected)`, `expect(value).toEqual(expected)`
- Truthiness: `expect(value).toBeTruthy()`, `expect(value).toBeFalsy()`
- Numbers: `expect(value).toBeGreaterThan(3)`, `expect(value).toBeLessThanOrEqual(3)`
- Strings: `expect(value).toMatch(/pattern/)`, `expect(value).toContain('substring')`
- Arrays: `expect(array).toContain(item)`, `expect(array).toHaveLength(3)`
- Objects: `expect(object).toHaveProperty('key', value)`
- Exceptions: `expect(fn).toThrow()`, `expect(fn).toThrow(Error)`
- Mock functions: `expect(mockFn).toHaveBeenCalled()`, `expect(mockFn).toHaveBeenCalledWith(arg1, arg2)`
