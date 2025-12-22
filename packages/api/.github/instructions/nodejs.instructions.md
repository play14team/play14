## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/nodejs-javascript-vitest.instructions.md -->

applyTo: '**/\*.js, **/_.mjs, \*\*/_.cjs'
description: 'Node.js and JavaScript development standards for the #play14 Strapi 5 API'

---

# Node.js and JavaScript Development Guidelines

## Coding Standards

- Use JavaScript with ES2022 features and Node.js (18+)
- Use ESM modules where possible, CommonJS for Strapi compatibility
- Use Node.js built-in modules and avoid external dependencies where possible
- Ask before adding new dependencies to maintain project stability
- Always use async/await for asynchronous code, and use 'node:util' promisify function to avoid callbacks
- Keep code simple and maintainable
- Use descriptive variable and function names
- Do not add comments unless absolutely necessary - code should be self-explanatory
- Never use `null`, always use `undefined` for optional values
- Prefer functions over classes

## Strapi 5 Specific Patterns

- Follow Strapi's directory structure conventions
- Use lifecycle hooks for data manipulation (beforeCreate, afterCreate, etc.)
- Implement custom routes in `src/api/*/routes/` following Strapi patterns
- Use Strapi's built-in validation and sanitization
- Follow the service-controller pattern for business logic
- Use Strapi's plugin system for extending functionality

## Error Handling

- Use try-catch blocks for async operations
- Throw meaningful error messages
- Use Strapi's built-in error handling mechanisms
- Log errors appropriately without exposing sensitive information

## Performance Considerations

- Use database queries efficiently
- Implement proper pagination for large datasets
- Cache frequently accessed data when appropriate
- Optimize media uploads and storage operations

## Security

- Validate all input data
- Use Strapi's built-in authentication and authorization
- Never expose sensitive configuration in client-side code
- Follow OWASP security guidelines for API development
