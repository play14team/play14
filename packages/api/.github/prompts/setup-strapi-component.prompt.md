---
mode: "agent"
description: "Create a new Strapi component with proper structure and schema"
tools: ["edit/editFiles", "search", "codebase"]
---

# Setup Strapi Component

Your goal is to create a new Strapi component with proper structure, schema, and integration into the existing Strapi 5 project.

## Information Required

Ask for the following information if not provided:

1. **Component Name**: The name of the component (e.g., "contact-form", "media-gallery")
2. **Component Category**: The category/namespace (e.g., "shared", "events", "games")
3. **Component Fields**: The fields and their types needed in the component
4. **Usage Context**: Where this component will be used (content types, other components)

## Component Creation Process

### 1. Create Component Directory Structure

```
src/components/[category]/[component-name]/
└── [component-name].json
```

### 2. Define Component Schema

Create the component schema with:

- Proper field definitions with types and validations
- Required field specifications
- Field descriptions and help text
- Appropriate default values

### 3. Component Schema Format

```json
{
  "collectionName": "components_[category]_[component_name]",
  "info": {
    "displayName": "Component Display Name",
    "description": "Component description"
  },
  "options": {},
  "attributes": {
    // Define fields here
  }
}
```

### 4. Update Content Types

If specified, update relevant content types to include the new component:

- Add component field to content type schema
- Update component relationships as needed
- Ensure proper component configuration (single/repeatable)

### 5. Best Practices

- Use consistent naming conventions
- Follow existing project patterns
- Include proper validations
- Add helpful descriptions
- Consider reusability across content types

## Field Types Reference

Common Strapi field types:

- `string`: Text input
- `text`: Textarea input
- `richtext`: Rich text editor
- `email`: Email input
- `number`: Number input
- `boolean`: Boolean checkbox
- `date`: Date picker
- `media`: File/image upload
- `relation`: Relationship to other content types
- `component`: Nested component
- `dynamiczone`: Dynamic zone for multiple components

## Validation Options

Common validation options:

- `required`: Make field mandatory
- `minLength`/`maxLength`: String length limits
- `min`/`max`: Number range limits
- `regex`: Pattern validation
- `unique`: Ensure uniqueness

Let me know the component details and I'll create it with proper structure and integration!
