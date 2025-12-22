## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/instructions/azure-devops-pipelines.instructions.md -->

applyTo: "**/azure-pipelines.yml, **/azure-pipelines*.yml, \*\*/*.pipeline.yml"
description: "Best practices for Azure DevOps Pipeline YAML files for infrastructure deployment"

---

# Azure DevOps Pipeline Best Practices

## General Guidelines

- Use YAML syntax consistently with proper indentation (2 spaces)
- Always include meaningful names and display names for pipelines, stages, jobs, and steps
- Implement proper error handling and conditional execution
- Use variables and parameters to make pipelines reusable and maintainable
- Follow the principle of least privilege for service connections and permissions
- Include comprehensive logging and diagnostics for troubleshooting

## Pipeline Structure

- Organize complex pipelines using stages for better visualization and control
- Use jobs to group related steps and enable parallel execution when possible
- Implement proper dependencies between stages and jobs
- Use templates for reusable pipeline components
- Keep pipeline files focused and modular - split large pipelines into multiple files

## Infrastructure Deployment Practices

- Validate Bicep templates before deployment using bicep build
- Use what-if deployments to preview changes before applying
- Implement proper approval gates for production deployments
- Use Azure Resource Manager deployment outputs for subsequent pipeline steps
- Implement rollback mechanisms for failed deployments

## Build Best Practices

- Use specific agent pool versions and VM images for consistency
- Cache dependencies (npm, NuGet, Maven, etc.) to improve build performance
- Implement proper artifact management with meaningful names and retention policies
- Use build variables for version numbers and build metadata
- Include code quality gates (linting, testing, security scans)
- Ensure builds are reproducible and environment-independent

## Testing Integration

- Run unit tests as part of the build process
- Publish test results in standard formats (JUnit, VSTest, etc.)
- Include code coverage reporting and quality gates
- Implement integration and end-to-end tests in appropriate stages
- Use test impact analysis when available to optimize test execution
- Fail fast on test failures to provide quick feedback

## Security Considerations

- Use Azure Key Vault for sensitive configuration and secrets
- Implement proper secret management with variable groups
- Use service connections with minimal required permissions
- Enable security scans (dependency vulnerabilities, static analysis)
- Implement approval gates for production deployments
- Use managed identities when possible instead of service principals

## Deployment Strategies

- Implement proper environment promotion (dev → staging → production)
- Use deployment jobs with proper environment targeting
- Implement blue-green or canary deployment strategies when appropriate
- Include rollback mechanisms and health checks
- Use infrastructure as code (ARM, Bicep, Terraform) for consistent deployments
- Implement proper configuration management per environment

## Variable and Parameter Management

- Use variable groups for shared configuration across pipelines
- Implement runtime parameters for flexible pipeline execution
- Use conditional variables based on branches or environments
- Secure sensitive variables and mark them as secrets
- Document variable purposes and expected values
- Use variable templates for complex variable logic

## Performance Optimization

- Use parallel jobs and matrix strategies when appropriate
- Implement proper caching strategies for dependencies and build outputs
- Use shallow clone for Git operations when full history isn't needed
- Optimize Docker image builds with multi-stage builds and layer caching
- Monitor pipeline performance and optimize bottlenecks
- Use pipeline resource triggers efficiently

## Monitoring and Observability

- Include comprehensive logging throughout the pipeline
- Use Azure Monitor and Application Insights for deployment tracking
- Implement proper notification strategies for failures and successes
- Include deployment health checks and automated rollback triggers
- Use pipeline analytics to identify improvement opportunities
- Document pipeline behavior and troubleshooting steps

## Template and Reusability

- Create pipeline templates for common patterns
- Use extends templates for complete pipeline inheritance
- Implement step templates for reusable task sequences
- Use variable templates for complex variable logic
- Version templates appropriately for stability
- Document template parameters and usage examples

## Branch and Trigger Strategy

- Implement appropriate triggers for different branch types
- Use path filters to trigger builds only when relevant files change
- Configure proper CI/CD triggers for main/master branches
- Use pull request triggers for code validation
- Implement scheduled triggers for maintenance tasks
- Consider resource triggers for multi-repository scenarios

## Infrastructure-Specific Pipeline Patterns

- Separate infrastructure pipelines from application pipelines
- Use multi-stage pipelines for environment promotion
- Implement infrastructure drift detection
- Use Azure Resource Graph queries for resource validation
- Implement cost analysis and optimization checks
- Include security and compliance scanning for infrastructure code

## Common Anti-Patterns to Avoid

- Hardcoding sensitive values directly in YAML files
- Using overly broad triggers that cause unnecessary builds
- Mixing build and deployment logic in a single stage
- Not implementing proper error handling and cleanup
- Using deprecated task versions without upgrade plans
- Creating monolithic pipelines that are difficult to maintain
- Not using proper naming conventions for clarity
- Ignoring pipeline security best practices
