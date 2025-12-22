## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/prompts/create-readme.prompt.md -->

mode: 'agent'
description: 'Generate comprehensive documentation for code, APIs, and project components'
tools: ['edit/editFiles', 'search', 'codebase']

---

# Generate Documentation

Your goal is to create comprehensive, well-structured documentation for the Strapi 5 API project, including API documentation, code documentation, and user guides.

## Documentation Types

### API Documentation

- Document all custom API endpoints
- Include request/response examples
- Document authentication requirements
- Specify parameter validation rules
- Provide error response examples

### Code Documentation

- Generate JSDoc comments for functions and classes
- Document complex business logic
- Explain configuration options
- Document plugin usage and setup
- Create inline code comments where needed

### User Documentation

- Content creator guides
- Admin panel usage instructions
- Deployment and setup guides
- Troubleshooting documentation
- Best practices guides

## Documentation Standards

### Structure and Format

- Use clear, consistent headings
- Include table of contents for long documents
- Use code blocks with proper syntax highlighting
- Include practical examples
- Use GitHub Flavored Markdown (GFM)

### Content Guidelines

- Write in clear, concise language
- Include practical examples
- Explain the "why" not just the "what"
- Update documentation with code changes
- Include screenshots where helpful

## API Documentation Format

### Endpoint Documentation

```markdown
## GET /api/events

Retrieve a list of events with pagination.

### Parameters

- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 25)
- `filters` (object, optional): Filter criteria

### Example Request

\`\`\`javascript
GET /api/events?page=1&pageSize=10&filters[status][$eq]=open
\`\`\`

### Example Response

\`\`\`json
{
"data": [...],
"meta": {
"pagination": { ... }
}
}
\`\`\`

### Error Responses

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error
```

## Code Documentation Format

### JSDoc Comments

```javascript
/**
 * Generate a slug for an event based on name and start date
 * @param {string} name - The event name
 * @param {string} start - The event start date (ISO string)
 * @returns {string} The generated slug in format "name-MM"
 * @example
 * eventToSlug("Play14 London", "2024-03-15T10:00:00Z")
 * // Returns "play14-london-03"
 */
function eventToSlug(name, start) {
  // Implementation
}
```

### Configuration Documentation

```javascript
// config/plugins.js
module.exports = {
  // Azure Storage configuration for file uploads
  upload: {
    config: {
      provider: "azure-storage",
      providerOptions: {
        // Storage account name (required)
        account: env("STORAGE_ACCOUNT"),
        // Storage account key (required)
        accountKey: env("STORAGE_ACCOUNT_KEY"),
        // CDN URL for optimized delivery (optional)
        cdnUrl: env("STORAGE_CDN_URL"),
      },
    },
  },
};
```

## README Templates

### Project README Structure

```markdown
# Project Name

Brief description of the project.

## Features

- List key features
- Highlight unique capabilities

## Quick Start

Step-by-step setup instructions

## Configuration

Environment variables and settings

## Usage

Common usage examples

## API Reference

Link to detailed API docs

## Contributing

Guidelines for contributors

## License

License information
```

### Component README

```markdown
# Component Name

Description of what this component does.

## Usage

How to use this component

## Configuration

Available options and settings

## Examples

Practical usage examples

## API

Methods and properties available
```

## Strapi-Specific Documentation

### Content Type Documentation

```markdown
# Event Content Type

Manages community events and gatherings.

## Fields

- `name` (string, required): Event name
- `description` (richtext): Event description
- `start` (datetime, required): Event start time
- `end` (datetime, required): Event end time
- `venue` (relation): Associated venue
- `status` (enumeration): Event status (announced, open, over, cancelled)

## Relationships

- Many-to-one with Venue
- Many-to-many with Players (attendees)

## Lifecycle Hooks

- `beforeCreate`: Generates slug from name and start date
- `afterUpdate`: Updates related records when status changes
```

### Plugin Documentation

````markdown
# Update Static Content Plugin

Triggers rebuild of the frontend static site when content changes.

## Configuration

```javascript
"update-static-content": {
  enabled: true,
  config: {
    githubToken: env('GITHUB_TOKEN'),
    repositoryOwner: 'play14team',
    repositoryName: 'play14-ui',
    workflowId: 52506304,
  },
},
```
````

## Usage

Automatically triggers on content type updates. No manual intervention required.

```

## Documentation Maintenance

### Keep Updated
- Review documentation during code reviews
- Update docs when APIs change
- Maintain accuracy with implementation
- Remove outdated information
- Add new features to documentation

### Quality Checks
- Verify all examples work
- Check links are not broken
- Ensure consistent formatting
- Test setup instructions
- Validate code examples

Specify what you'd like me to document, and I'll create comprehensive, well-structured documentation following these standards!
```
