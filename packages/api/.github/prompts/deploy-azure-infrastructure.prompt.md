---
mode: "agent"
description: "Deploy Azure infrastructure using Bicep templates with validation and best practices"
tools: ["edit/editFiles", "codebase", "runCommands", "fetch"]
---

# Deploy Azure Infrastructure

Your goal is to deploy Azure infrastructure using Bicep templates following Azure best practices and ensuring proper validation.

## Information Required

Ask for the following information if not provided:

1. **Target Environment**: Development, Staging, or Production
2. **Resource Group**: Name of the target resource group
3. **Azure Subscription**: Subscription ID or name
4. **Location**: Azure region for deployment
5. **Parameter File**: Environment-specific parameter file path

## Deployment Process

### 1. Pre-Deployment Validation

Validate the infrastructure setup before deployment:

- Check Azure CLI authentication and subscription context
- Validate Bicep template syntax using `bicep build`
- Review parameter files for environment-specific values
- Ensure resource naming follows Azure conventions
- Check for any policy restrictions in target subscription

### 2. Template Validation

```powershell
# Validate Bicep template syntax
bicep build iac/main.bicep

# Validate deployment without executing
az deployment group validate `
  --resource-group $resourceGroupName `
  --template-file iac/main.bicep `
  --parameters @iac/parameters/$environment.parameters.json
```

### 3. What-If Analysis

Perform what-if deployment to preview changes:

```powershell
# Preview deployment changes
az deployment group what-if `
  --resource-group $resourceGroupName `
  --template-file iac/main.bicep `
  --parameters @iac/parameters/$environment.parameters.json
```

Review the what-if results with the user before proceeding.

### 4. Infrastructure Deployment

Execute the deployment with proper logging:

```powershell
# Deploy infrastructure
az deployment group create `
  --resource-group $resourceGroupName `
  --template-file iac/main.bicep `
  --parameters @iac/parameters/$environment.parameters.json `
  --name "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
  --verbose
```

### 5. Post-Deployment Verification

Verify successful deployment:

- Check deployment status and outputs
- Validate resource creation and configuration
- Test connectivity and functionality
- Verify security configurations
- Check monitoring and logging setup

## Environment-Specific Considerations

### Development Environment

- Use cost-optimized SKUs and pricing tiers
- Implement resource scheduling for cost savings
- Use basic monitoring and logging
- Configure relaxed security for development access

### Staging Environment

- Mirror production configuration with smaller scale
- Implement full monitoring and alerting
- Use production-like security configurations
- Test deployment procedures and rollback scenarios

### Production Environment

- Use high-availability configurations
- Implement comprehensive monitoring and alerting
- Apply strict security configurations
- Use reserved instances for cost optimization
- Implement proper backup and disaster recovery

## Best Practices

### Security

- Use managed identities for authentication
- Implement private endpoints where applicable
- Configure proper RBAC assignments
- Store secrets in Azure Key Vault
- Enable security monitoring and alerts

### Performance

- Choose appropriate SKUs for workload requirements
- Configure auto-scaling where beneficial
- Implement CDN for content delivery
- Optimize network connectivity
- Monitor performance metrics post-deployment

### Cost Optimization

- Use appropriate pricing tiers for each environment
- Implement resource tagging for cost allocation
- Configure cost alerts and budgets
- Regular cost reviews and optimization
- Use Azure Advisor recommendations

### Monitoring

- Configure diagnostic settings for all resources
- Set up Application Insights for applications
- Implement custom dashboards and alerts
- Configure log retention policies
- Set up automated monitoring reports

## Error Handling

### Common Deployment Issues

- **Resource naming conflicts**: Use unique naming conventions
- **Policy violations**: Check Azure Policy requirements
- **Permission issues**: Verify RBAC assignments
- **Quota limitations**: Check subscription quotas
- **Template errors**: Validate Bicep syntax and parameters

### Rollback Procedures

- Document rollback procedures for each environment
- Maintain previous deployment templates
- Implement database backup and restore procedures
- Test rollback procedures in non-production environments
- Document recovery time objectives (RTO)

## Documentation

- Document deployment procedures and configurations
- Maintain infrastructure as code in version control
- Create environment-specific documentation
- Document troubleshooting procedures
- Update documentation with each deployment

## Compliance and Governance

- Ensure compliance with organizational standards
- Implement proper resource tagging
- Follow change management procedures
- Document deployment approvals
- Maintain audit trails for deployments

Provide the deployment details and I'll help you deploy the Azure infrastructure safely and efficiently!
