---
applyTo: "**/*.js, **/*.json, **/*.ts, **/*.md"
description: "Strapi 5 specific development best practices and patterns"
---

# Strapi 5 Development Best Practices

## Content Types

- Define schemas in `src/api/*/content-types/*/schema.json`
- Use appropriate field types and validations
- Implement proper relationships between content types
- Use components for reusable field groups in `src/components/`

## Lifecycle Hooks

- Use lifecycle hooks for data manipulation and validation
- Implement hooks in `src/api/*/content-types/*/lifecycles.js`
- Common hooks: beforeCreate, afterCreate, beforeUpdate, afterUpdate
- Use hooks for slug generation, data validation, and relationship management

## Services and Controllers

- Keep controllers thin - delegate business logic to services
- Implement complex queries in services
- Use Strapi's entity service API for database operations
- Follow RESTful conventions for API endpoints

## Plugin Development

- Create custom plugins in `src/plugins/` directory
- Use plugin lifecycle methods properly
- Register plugin routes and services correctly
- Follow Strapi's plugin architecture patterns

## Database Queries

- Use Strapi's Query Engine for complex queries
- Implement proper filtering, sorting, and pagination
- Use populate for relationships efficiently
- Avoid N+1 query problems

## Configuration

- Use environment-specific configurations in `config/env/`
- Keep sensitive data in environment variables
- Use proper middleware configuration
- Configure plugins appropriately for each environment

## API Customization

- Create custom routes in `src/api/*/routes/`
- Use proper HTTP methods and status codes
- Implement custom middleware when needed
- Follow Strapi's routing conventions

## Performance Optimization

- Use database indexes appropriately
- Implement caching strategies for frequently accessed data
- Optimize media handling and uploads
- Use proper pagination for large datasets

## Security Best Practices

- Use Strapi's built-in authentication and authorization
- Implement proper role-based access control
- Validate and sanitize all input data
- Use HTTPS in production environments
- Keep Strapi and dependencies updated
