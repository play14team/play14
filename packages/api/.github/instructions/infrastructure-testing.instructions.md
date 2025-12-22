---
applyTo: "**/*.bicep, **/*.json, **/iac/**"
description: "Infrastructure testing standards and practices for Azure resources"
---

# Infrastructure Testing Best Practices

## Testing Framework

- Use Azure Resource Manager Template Test Toolkit (arm-ttk) for ARM/Bicep validation
- Use Pester for PowerShell infrastructure scripts testing
- Implement validation tests for all infrastructure templates
- Test both successful deployments and failure scenarios

## Template Validation

### Bicep Template Testing

- Use `bicep build` to validate template syntax
- Use `az deployment group validate` for deployment validation
- Implement unit tests for Bicep modules using Azure CLI
- Test template outputs and parameter validation

### Infrastructure Integration Testing

- Deploy to isolated test environments
- Validate resource creation and configuration
- Test resource connectivity and networking
- Verify security configurations and access controls

## Test Structure

- Name test files with `.tests.ps1` suffix for PowerShell tests
- Place test files alongside infrastructure templates
- Use descriptive test names that explain expected infrastructure behavior
- Organize tests by resource type and functionality

## Azure Resource Testing Patterns

### Resource Deployment Tests

- Test successful resource creation
- Validate resource properties and configurations
- Test resource dependencies and relationships
- Verify resource naming conventions

### Security Testing

- Test network security group rules
- Validate private endpoint configurations
- Test managed identity assignments
- Verify Key Vault access policies

### Performance Testing

- Test auto-scaling configurations
- Validate performance tier selections
- Test load balancing configurations
- Verify monitoring and alerting setup

## Test Data Management

- Use parameter files for test deployments
- Clean up test resources after each test run
- Use resource group isolation for test environments
- Implement test resource tagging for identification

## Cost Management Testing

- Test cost-optimized configurations for development environments
- Validate production SKU selections
- Test resource cleanup and lifecycle management
- Implement cost monitoring alerts

## Environment Testing

- Test deployment across different Azure regions
- Validate environment-specific configurations
- Test disaster recovery and backup configurations
- Verify cross-environment connectivity

## Automated Testing Pipeline

- Integrate testing into CI/CD pipelines
- Run validation tests on pull requests
- Implement smoke tests for deployed infrastructure
- Use what-if deployments for change validation

## Common Test Scenarios

### Bicep Module Tests

```powershell
Describe "Storage Account Module" {
    It "Should create storage account with correct configuration" {
        # Test implementation
    }

    It "Should configure private endpoints" {
        # Test implementation
    }
}
```

### Infrastructure Validation Tests

- Test resource group creation and configuration
- Validate virtual network and subnet configurations
- Test application gateway and load balancer setup
- Verify monitoring and logging configurations

## Test Documentation

- Document test scenarios and expected outcomes
- Include infrastructure testing in deployment guides
- Maintain test result reports and metrics
- Document troubleshooting steps for common test failures

## Monitoring and Observability Testing

- Test monitoring dashboard creation
- Validate alert rule configurations
- Test log analytics workspace setup
- Verify Application Insights integration

## Disaster Recovery Testing

- Test backup and restore procedures
- Validate failover mechanisms
- Test cross-region replication
- Verify recovery time objectives (RTO) and recovery point objectives (RPO)
