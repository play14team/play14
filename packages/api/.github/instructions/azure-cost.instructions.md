---
applyTo: "**/*.bicep, **/*.json, **/iac/**"
description: "Azure cost optimization guidelines for infrastructure resources"
---

# Azure Cost Optimization Guidelines

## Cost Management Principles

- Right-size resources based on actual usage patterns
- Use appropriate pricing tiers for each environment
- Implement auto-scaling to match demand
- Regular cost reviews and optimization cycles
- Set up cost alerts and budgets for monitoring

## Resource Right-Sizing

### Compute Resources

- Choose appropriate VM sizes based on workload requirements
- Use burstable instances for variable workloads
- Implement auto-shutdown for development environments
- Consider spot instances for non-critical workloads
- Use Azure Advisor recommendations for sizing optimization

### Storage Optimization

- Implement storage lifecycle policies (Hot → Cool → Archive)
- Choose appropriate redundancy levels per environment
- Use managed disks with appropriate performance tiers
- Remove unused storage accounts and blob containers
- Implement storage analytics for usage patterns

### Database Cost Optimization

- Use serverless options for variable workloads
- Right-size database compute and storage separately
- Implement automatic pausing for development databases
- Use read replicas only when necessary
- Consider Azure SQL Database vs. Managed Instance costs

## Environment-Specific Cost Strategies

### Development Environments

- Use lower-cost pricing tiers (Basic, Standard)
- Implement resource scheduling (shut down after hours)
- Share resources across development teams where possible
- Use smaller VM sizes and storage tiers
- Limit geographic distribution

### Production Environments

- Balance cost with performance and availability requirements
- Use reserved instances for predictable workloads
- Implement proper monitoring to avoid over-provisioning
- Use Azure Hybrid Benefit for Windows and SQL Server
- Consider multi-region deployment costs vs. availability needs

## Cost Monitoring and Alerting

### Budget Configuration

- Set up budgets for each environment and project
- Configure alerts at 50%, 80%, and 100% of budget
- Use action groups for automated responses
- Review budget performance monthly
- Adjust budgets based on seasonal patterns

### Cost Analysis

- Use Azure Cost Management for detailed cost analysis
- Implement cost allocation using resource tags
- Monitor cost trends and identify anomalies
- Create custom cost reports for stakeholders
- Track cost per application or business unit

## Resource Lifecycle Management

### Automated Cleanup

- Implement policies for resource deletion
- Use resource tags for lifecycle management
- Automate removal of unused resources
- Set up alerts for orphaned resources
- Implement approval workflows for resource creation

### Capacity Planning

- Monitor resource utilization trends
- Plan for growth and seasonal variations
- Implement predictive scaling based on historical data
- Review and adjust capacity regularly
- Use Azure Monitor for utilization metrics

## Cost-Optimized Architecture Patterns

### Serverless and Consumption-Based Services

- Use Azure Functions for event-driven workloads
- Consider Logic Apps for workflow automation
- Use Event Grid for event routing
- Implement API Management for API optimization
- Use Container Apps for microservices

### Data Management Optimization

- Implement data archiving strategies
- Use compression for data storage
- Optimize data transfer costs
- Consider data locality for performance and cost
- Use CDN for content delivery optimization

## Reserved Capacity and Savings Plans

- Purchase reserved instances for predictable workloads
- Use Azure Savings Plans for flexible compute usage
- Consider hybrid use benefits for existing licenses
- Plan reserved capacity purchases based on usage patterns
- Monitor reserved instance utilization

## Cost Governance

### Policy Implementation

- Use Azure Policy for cost governance
- Implement resource size restrictions
- Require cost center tags for all resources
- Set up approval workflows for expensive resources
- Monitor policy compliance regularly

### Organizational Cost Management

- Implement chargeback or showback models
- Create cost-aware culture within teams
- Provide cost training for development teams
- Regular cost optimization reviews
- Share cost optimization success stories

## Performance vs. Cost Trade-offs

### Optimization Strategies

- Monitor application performance metrics
- Identify over-provisioned resources
- Balance performance requirements with cost
- Use caching to reduce compute requirements
- Implement efficient data access patterns

### Testing Cost Optimization

- Test cost optimization changes in non-production
- Monitor performance impact of cost reductions
- Implement rollback procedures for performance issues
- Use A/B testing for architecture changes
- Document cost vs. performance decisions

## Common Cost Optimization Opportunities

- Unused or idle virtual machines
- Over-provisioned database resources
- Inappropriate storage tiers
- Unused public IP addresses
- Excessive data transfer costs
- Unused Application Gateways or Load Balancers
- Development resources running 24/7
- Missing auto-scaling configurations

## Cost Optimization Reporting

- Create monthly cost optimization reports
- Track cost savings from optimization initiatives
- Monitor cost per transaction or user
- Report on budget variance and trends
- Document cost optimization recommendations and implementations
