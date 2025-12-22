## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/bicep-code-best-practices.instructions.md -->

applyTo: "\*_/_.bicep"
description: "Infrastructure as Code with Bicep best practices for Azure resources"

---

# Bicep Infrastructure as Code Guidelines

## Naming Conventions

- Use lowerCamelCase for all names (variables, parameters, resources)
- Use resource type descriptive symbolic names (e.g., 'storageAccount' not 'storageAccountName')
- Avoid using 'name' in a symbolic name as it represents the resource, not the resource's name
- Avoid distinguishing variables and parameters by the use of suffixes

## Structure and Declaration

- Always declare parameters at the top of files with @description decorators
- Use latest stable API versions for all resources
- Use descriptive @description decorators for all parameters
- Specify minimum and maximum character length for naming parameters

## Parameters

- Set default values that are safe for test environments (use low-cost pricing tiers)
- Use @allowed decorator sparingly to avoid blocking valid deployments
- Use parameters for settings that change between deployments

## Variables

- Variables automatically infer type from the resolved value
- Use variables to contain complex expressions instead of embedding them directly in resource properties

## Resource References

- Use symbolic names for resource references instead of reference() or resourceId() functions
- Create resource dependencies through symbolic names (resourceA.id) not explicit dependsOn
- For accessing properties from other resources, use the 'existing' keyword instead of passing values through outputs

## Resource Names

- Use template expressions with uniqueString() to create meaningful and unique resource names
- Add prefixes to uniqueString() results since some resources don't allow names starting with numbers

## Child Resources

- Avoid excessive nesting of child resources
- Use parent property or nesting instead of constructing resource names for child resources

## Security

- Never include secrets or keys in outputs
- Use resource properties directly in outputs (e.g., storageAccount.properties.primaryEndpoints)
- Use managed identities for authentication between resources
- Implement private endpoints for secure network connectivity

## Azure Verified Modules (AVM)

- Prefer Azure Verified Modules over raw resources when available
- Use the latest stable version of AVM modules
- Follow AVM module documentation for parameter configuration
- Check AVM module registry at br/public:avm/ for available modules

## Environment Configuration

- Use parameter files for environment-specific configurations
- Implement proper environment naming conventions
- Use conditional logic for environment-specific resource configurations
- Separate development, staging, and production parameter files

## Documentation

- Include helpful // comments within your Bicep files to improve readability
- Document complex expressions and business logic
- Use @description decorators for all parameters and outputs
- Maintain README files for module documentation

## Testing and Validation

- Use bicep build to validate template syntax
- Use az deployment group validate for deployment validation
- Implement what-if deployments before actual deployment
- Test templates in non-production environments first

## Performance and Cost Optimization

- Choose appropriate SKUs and pricing tiers for each environment
- Implement auto-scaling where beneficial
- Use Azure Cost Management integration for cost tracking
- Consider regional deployment for performance optimization
