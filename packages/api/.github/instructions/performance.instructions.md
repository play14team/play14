---
applyTo: "**/*.js, **/*.json, **/*.sql"
description: "Performance optimization guidelines for the Strapi 5 API"
---

# Performance Optimization Guidelines

## Database Performance

- Use proper database indexes for frequently queried fields
- Implement efficient database relationships
- Use population selectively to avoid over-fetching data
- Optimize queries to prevent N+1 problems
- Use database connection pooling effectively

## API Performance

- Implement proper pagination for large datasets
- Use field selection to return only necessary data
- Cache frequently accessed data using Redis or in-memory caching
- Implement rate limiting to prevent API abuse
- Use compression middleware for response data

## Memory Management

- Monitor memory usage and implement proper cleanup
- Avoid memory leaks in long-running processes
- Use streaming for large file operations
- Implement proper garbage collection strategies
- Monitor and optimize heap usage

## File and Asset Optimization

- Optimize image sizes and formats
- Use CDN for static asset delivery
- Implement proper file caching headers
- Compress files before storage
- Use appropriate file storage strategies

## Code Performance

- Use efficient algorithms and data structures
- Avoid synchronous operations in request handlers
- Implement proper error handling to prevent performance degradation
- Use lazy loading for non-critical resources
- Profile code to identify performance bottlenecks

## Caching Strategies

- Implement response caching for static content
- Use database query caching appropriately
- Cache computed results for expensive operations
- Implement cache invalidation strategies
- Use appropriate cache TTL values

## Monitoring and Profiling

- Monitor API response times
- Track database query performance
- Monitor memory and CPU usage
- Implement performance logging
- Use APM tools for production monitoring

## Strapi-Specific Optimizations

- Configure Strapi plugins for optimal performance
- Use efficient content type relationships
- Optimize media handling and processing
- Configure proper middleware ordering
- Use Strapi's built-in performance features

## Network Performance

- Use HTTP/2 where possible
- Implement proper connection keep-alive
- Minimize payload sizes
- Use efficient serialization formats
- Implement proper timeout configurations

## Scalability Considerations

- Design stateless applications for horizontal scaling
- Use load balancing strategies effectively
- Implement proper session management for scaling
- Design database schemas for scalability
- Use microservices patterns where appropriate
