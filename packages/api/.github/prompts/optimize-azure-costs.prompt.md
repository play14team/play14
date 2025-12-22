## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/prompts/az-cost-optimize.prompt.md -->

mode: 'agent'
description: 'Analyze and optimize Azure infrastructure costs with actionable recommendations'
tools: ['edit/editFiles', 'codebase', 'runCommands', 'fetch']

---

# Optimize Azure Costs

Your goal is to analyze Azure infrastructure costs and provide actionable optimization recommendations with potential savings calculations.

## Prerequisites

- Azure CLI access with appropriate permissions
- Target Azure subscription and resource group identified
- Infrastructure as Code files (Bicep, ARM templates) if available

## Analysis Process

### Step 1: Infrastructure Discovery

Discover and analyze current Azure resources:

```powershell
# List all resources in the subscription
az resource list --query "[].{Name:name, Type:type, ResourceGroup:resourceGroup, Location:location}" --output table

# Get resource group details
az group list --query "[].{Name:name, Location:location}" --output table

# Analyze specific resource types
az vm list --query "[].{Name:name, Size:hardwareProfile.vmSize, Status:powerState}" --output table
az storage account list --query "[].{Name:name, Sku:sku.name, Tier:sku.tier}" --output table
```

### Step 2: Cost Analysis

Analyze current costs and usage patterns:

```powershell
# Get cost analysis for the subscription
az consumption usage list --start-date $(Get-Date).AddDays(-30).ToString("yyyy-MM-dd") --end-date $(Get-Date).ToString("yyyy-MM-dd")

# Analyze costs by resource group
az consumption usage list --start-date $(Get-Date).AddDays(-30).ToString("yyyy-MM-dd") --end-date $(Get-Date).ToString("yyyy-MM-dd") --query "[].{ResourceGroup:instanceName, Cost:pretaxCost}"
```

### Step 3: Resource Utilization Analysis

Check resource utilization metrics:

```powershell
# Get VM utilization metrics
az monitor metrics list --resource-group $resourceGroup --resource $vmName --resource-type Microsoft.Compute/virtualMachines --metric "Percentage CPU" --interval PT1H

# Check storage account usage
az storage account show-usage --account-name $storageAccountName
```

### Step 4: Optimization Recommendations

## Common Optimization Opportunities

### Compute Optimization

**Virtual Machines**:

- Right-size VMs based on CPU and memory utilization
- Use burstable VM series for variable workloads
- Implement auto-shutdown for development environments
- Consider spot instances for non-critical workloads

**App Services**:

- Evaluate App Service plan utilization
- Consider consumption plans for low-traffic applications
- Implement auto-scaling based on metrics
- Use deployment slots efficiently

### Storage Optimization

**Storage Accounts**:

- Implement lifecycle management policies
- Move infrequently accessed data to cool or archive tiers
- Remove unused storage accounts and containers
- Optimize replication settings based on requirements

**Database Services**:

- Right-size database compute and storage
- Use serverless options for variable workloads
- Implement automatic pausing for development databases
- Optimize backup retention policies

### Network Optimization

**Load Balancers and Gateways**:

- Consolidate underutilized load balancers
- Remove unused public IP addresses
- Optimize bandwidth allocations
- Consider Azure Front Door for global applications

### Monitoring and Management

**Log Analytics**:

- Optimize log retention periods
- Remove unnecessary data collection rules
- Use sampling for high-volume applications
- Archive old log data

## Cost Optimization Strategies

### Environment-Specific Optimizations

**Development Environments**:

- Use lower-cost SKUs (Basic, Standard)
- Implement resource scheduling (auto-shutdown)
- Share resources across development teams
- Use smaller instance sizes

**Production Environments**:

- Purchase reserved instances for predictable workloads
- Use Azure Hybrid Benefit for Windows/SQL licenses
- Implement auto-scaling for variable demand
- Consider Azure Savings Plans

### Governance and Policies

**Cost Management**:

- Set up budgets and cost alerts
- Implement resource tagging for cost allocation
- Use Azure Policy for resource governance
- Regular cost reviews with stakeholders

**Resource Lifecycle**:

- Implement automated resource cleanup
- Use resource tags for lifecycle management
- Set up approval workflows for expensive resources
- Monitor and remove orphaned resources

## Implementation Plan

### Phase 1: Quick Wins (0-30 days)

1. **Immediate Actions**:

   - Remove unused resources
   - Stop oversized development VMs
   - Implement basic resource tagging
   - Set up cost alerts

2. **Low-Risk Optimizations**:
   - Move appropriate data to cool storage
   - Right-size underutilized resources
   - Implement auto-shutdown for development
   - Remove unused public IP addresses

### Phase 2: Strategic Optimizations (30-90 days)

1. **Reserved Capacity**:

   - Analyze usage patterns for reserved instances
   - Purchase reserved instances for predictable workloads
   - Consider Azure Savings Plans for flexible usage

2. **Architecture Optimizations**:
   - Implement auto-scaling where appropriate
   - Optimize database configurations
   - Consolidate underutilized services
   - Implement caching strategies

### Phase 3: Advanced Optimization (90+ days)

1. **Advanced Strategies**:
   - Consider multi-region cost optimization
   - Implement advanced monitoring and analytics
   - Optimize data transfer costs
   - Evaluate alternative architectures

## Monitoring and Reporting

### Cost Tracking

- Set up cost management dashboards
- Implement monthly cost review processes
- Track optimization savings over time
- Create cost allocation reports by business unit

### Performance Monitoring

- Monitor performance impact of optimizations
- Set up alerts for performance degradation
- Implement rollback procedures if needed
- Document optimization decisions and outcomes

## Risk Assessment

### Optimization Risks

- **Performance Impact**: Monitor application performance after changes
- **Availability Impact**: Test high availability configurations
- **Compliance Impact**: Ensure optimizations don't violate compliance requirements
- **Operational Impact**: Consider operational overhead of managing optimizations

### Mitigation Strategies

- Test optimizations in non-production environments first
- Implement gradual rollout for production changes
- Maintain rollback procedures for all optimizations
- Document and communicate changes to stakeholders

Provide your Azure subscription details and target resource groups, and I'll help you identify and implement cost optimization opportunities!
