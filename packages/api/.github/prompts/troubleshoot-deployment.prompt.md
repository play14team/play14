---
mode: "agent"
description: "Systematically troubleshoot Azure deployment issues and infrastructure problems"
tools: ["edit/editFiles", "codebase", "runCommands", "fetch"]
---

# Troubleshoot Deployment Issues

Your goal is to systematically identify, analyze, and resolve Azure deployment issues and infrastructure problems using structured troubleshooting approaches.

## Troubleshooting Process

### Phase 1: Problem Assessment

#### 1. Gather Context

**Deployment Information**:

- Deployment method (Azure CLI, PowerShell, Azure Portal)
- Target environment (dev, staging, production)
- Bicep template or ARM template details
- Parameter files and configuration
- Recent changes or updates

**Error Analysis**:

```powershell
# Get deployment status and errors
az deployment group list --resource-group $resourceGroup --query "[].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}"

# Get detailed error information
az deployment operation group list --resource-group $resourceGroup --name $deploymentName --query "[?properties.provisioningState=='Failed'].{Resource:properties.targetResource.resourceName, Error:properties.statusMessage.error}"
```

#### 2. Environment Validation

**Prerequisites Check**:

- Azure CLI authentication and subscription context
- Required permissions and RBAC assignments
- Resource quotas and subscription limits
- Azure Policy compliance requirements

### Phase 2: Issue Classification

#### Common Deployment Issues

**Template and Parameter Issues**:

- Syntax errors in Bicep templates
- Invalid parameter values or types
- Missing required parameters
- Resource dependency conflicts

**Resource Configuration Issues**:

- Invalid resource configurations
- Naming convention violations
- SKU or location restrictions
- API version compatibility problems

**Permission and Access Issues**:

- Insufficient RBAC permissions
- Service principal authentication failures
- Resource provider registration issues
- Subscription or resource group access problems

**Infrastructure Issues**:

- Network connectivity problems
- DNS resolution failures
- Storage account access issues
- Key Vault permissions and secrets

## Systematic Troubleshooting

### Step 1: Template Validation

**Bicep Template Validation**:

```powershell
# Validate Bicep syntax
bicep build main.bicep

# Check for linting issues
bicep lint main.bicep

# Validate deployment template
az deployment group validate --resource-group $resourceGroup --template-file main.bicep --parameters @parameters.json
```

**Common Template Issues**:

- **Syntax Errors**: Check bracket matching, parameter references
- **Type Mismatches**: Validate parameter types and default values
- **Resource Dependencies**: Ensure proper dependency ordering
- **API Versions**: Use latest stable API versions

### Step 2: Parameter Analysis

**Parameter Validation**:

```powershell
# Check parameter file structure
Get-Content parameters.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Validate parameter values against template requirements
az deployment group validate --resource-group $resourceGroup --template-file main.bicep --parameters @parameters.json --verbose
```

**Parameter Issues**:

- **Missing Required Parameters**: Check template requirements
- **Invalid Values**: Validate against allowed values or constraints
- **Environment Mismatches**: Ensure correct parameter file usage
- **Secret References**: Validate Key Vault references and permissions

### Step 3: Resource-Specific Troubleshooting

#### Storage Account Issues

**Common Problems**:

- Storage account name already exists globally
- Invalid storage account name format
- Location restrictions for storage types
- Network access rule conflicts

**Diagnostic Commands**:

```powershell
# Check storage account name availability
az storage account check-name --name $storageAccountName

# Validate storage account configuration
az storage account show --name $storageAccountName --resource-group $resourceGroup

# Check network access rules
az storage account network-rule list --account-name $storageAccountName --resource-group $resourceGroup
```

#### Virtual Machine Issues

**Common Problems**:

- VM size not available in target region
- Image reference issues
- Network security group blocking access
- Disk encryption configuration problems

**Diagnostic Commands**:

```powershell
# Check VM size availability
az vm list-sizes --location $location --query "[?name=='$vmSize']"

# Validate VM configuration
az vm show --name $vmName --resource-group $resourceGroup

# Check VM status and diagnostics
az vm get-instance-view --name $vmName --resource-group $resourceGroup
```

#### Network Configuration Issues

**Common Problems**:

- Subnet address space conflicts
- Network security group rule conflicts
- Private endpoint DNS resolution issues
- Load balancer configuration problems

**Diagnostic Commands**:

```powershell
# Check virtual network configuration
az network vnet show --name $vnetName --resource-group $resourceGroup

# Validate subnet configurations
az network vnet subnet list --vnet-name $vnetName --resource-group $resourceGroup

# Check network security group rules
az network nsg rule list --nsg-name $nsgName --resource-group $resourceGroup
```

### Step 4: Permission and Access Issues

#### RBAC Troubleshooting

**Permission Validation**:

```powershell
# Check current user permissions
az role assignment list --assignee $(az account show --query user.name -o tsv) --resource-group $resourceGroup

# Validate service principal permissions
az role assignment list --assignee $servicePrincipalId --resource-group $resourceGroup

# Check required resource provider registrations
az provider list --query "[?registrationState=='NotRegistered'].namespace" -o table
```

#### Key Vault Access Issues

**Access Policy Validation**:

```powershell
# Check Key Vault access policies
az keyvault show --name $keyVaultName --resource-group $resourceGroup --query properties.accessPolicies

# Validate Key Vault network access
az keyvault network-rule list --name $keyVaultName --resource-group $resourceGroup

# Test secret access
az keyvault secret show --vault-name $keyVaultName --name $secretName
```

### Step 5: Infrastructure Connectivity

#### Network Connectivity Testing

**Connectivity Validation**:

```powershell
# Test network connectivity
Test-NetConnection -ComputerName $targetHost -Port $targetPort

# Check DNS resolution
Resolve-DnsName $dnsName

# Validate private endpoint connectivity
az network private-endpoint-connection list --resource-group $resourceGroup
```

#### Application Connectivity

**Service Health Checks**:

```powershell
# Check application endpoint health
Invoke-WebRequest -Uri $healthCheckUrl -Method GET

# Validate database connectivity
Test-Connection -TargetName $databaseServer -TcpPort 1433

# Check storage account connectivity
az storage account show-connection-string --name $storageAccountName --resource-group $resourceGroup
```

## Advanced Troubleshooting

### Deployment History Analysis

**Historical Analysis**:

```powershell
# Get deployment history
az deployment group list --resource-group $resourceGroup --query "[].{Name:name, State:properties.provisioningState, Timestamp:properties.timestamp}" --output table

# Compare successful vs. failed deployments
az deployment operation group list --resource-group $resourceGroup --name $deploymentName --query "[].{Resource:properties.targetResource.resourceName, State:properties.provisioningState, StatusCode:properties.statusCode}"
```

### Resource Dependency Analysis

**Dependency Mapping**:

- Identify resource creation order
- Check for circular dependencies
- Validate explicit vs. implicit dependencies
- Analyze dependency failure impact

### Performance and Timeout Issues

**Timeout Analysis**:

```powershell
# Check deployment duration
az deployment group show --resource-group $resourceGroup --name $deploymentName --query "properties.{Duration:duration, StartTime:timestamp}"

# Monitor resource provisioning times
az deployment operation group list --resource-group $resourceGroup --name $deploymentName --query "[].{Resource:properties.targetResource.resourceName, Duration:properties.duration}"
```

## Issue Resolution Strategies

### Immediate Actions

**Critical Issues**:

1. Stop any ongoing failed deployments
2. Assess impact on existing resources
3. Implement immediate workarounds if needed
4. Document issue details and timeline
5. Notify stakeholders if production is affected

**Rollback Procedures**:

```powershell
# Delete failed resources
az resource delete --resource-group $resourceGroup --name $resourceName --resource-type $resourceType

# Restore from previous successful deployment
az deployment group create --resource-group $resourceGroup --template-file backup/main.bicep --parameters @backup/parameters.json
```

### Root Cause Analysis

**Issue Investigation**:

- Analyze deployment logs and error messages
- Check Azure service health and status pages
- Review recent changes to templates or parameters
- Validate environment-specific configurations
- Test deployment in isolated environment

### Prevention Strategies

**Proactive Measures**:

- Implement comprehensive template validation
- Use what-if deployments before production changes
- Establish deployment testing procedures
- Create deployment rollback procedures
- Monitor Azure service health and announcements

## Documentation and Knowledge Sharing

### Issue Documentation

**Troubleshooting Records**:

- Document issue symptoms and error messages
- Record troubleshooting steps and findings
- Document resolution steps and outcomes
- Create knowledge base entries for common issues
- Share lessons learned with team members

### Continuous Improvement

**Process Enhancement**:

- Update deployment procedures based on lessons learned
- Enhance template validation and testing
- Improve monitoring and alerting for early issue detection
- Regular review of deployment failures and patterns
- Training team members on troubleshooting techniques

Describe the deployment issue you're experiencing, including error messages and context, and I'll help you troubleshoot it systematically!
