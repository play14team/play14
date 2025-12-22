---
applyTo: "**/*.bicep, **/*.json, **/iac/**"
description: "Azure monitoring and observability best practices for infrastructure"
---

# Azure Monitoring and Observability Guidelines

## Monitoring Architecture

- Implement centralized logging using Azure Monitor Logs
- Use Application Insights for application performance monitoring
- Configure Azure Monitor Metrics for infrastructure monitoring
- Set up Azure Service Health for service availability tracking
- Implement distributed tracing for complex applications

## Log Analytics Workspace Configuration

### Workspace Design

- Use separate workspaces for different environments (dev, staging, prod)
- Configure appropriate data retention periods based on requirements
- Implement workspace access control using RBAC
- Set up log data export for long-term retention
- Monitor workspace usage and costs

### Data Collection

- Configure diagnostic settings for all Azure resources
- Use Azure Monitor Agent for virtual machine monitoring
- Implement custom log collection for applications
- Set up security audit logging for compliance
- Configure performance counter collection

## Application Insights Integration

### APM Configuration

- Instrument applications with Application Insights SDK
- Configure dependency tracking and correlation
- Set up custom telemetry for business metrics
- Implement sampling strategies for high-volume applications
- Configure availability tests for critical endpoints

### Performance Monitoring

- Monitor application response times and throughput
- Track database query performance
- Monitor external dependency performance
- Set up exception tracking and error monitoring
- Implement user experience monitoring

## Infrastructure Monitoring

### Resource Health Monitoring

- Monitor CPU, memory, and disk utilization
- Set up network performance monitoring
- Track storage account performance metrics
- Monitor database performance indicators
- Implement container and Kubernetes monitoring

### Service Monitoring

- Monitor Azure service availability and performance
- Track API gateway metrics and latency
- Monitor load balancer health and performance
- Set up content delivery network (CDN) monitoring
- Track security service performance

## Alerting and Notification

### Alert Rule Configuration

- Create metric alerts for performance thresholds
- Set up log search alerts for error conditions
- Implement activity log alerts for resource changes
- Configure smart detection alerts for anomalies
- Use action groups for notification routing

### Alert Management

- Implement alert severity levels and escalation
- Configure alert suppression rules to reduce noise
- Set up alert correlation and grouping
- Document alert response procedures
- Regular review and tuning of alert rules

## Dashboard and Visualization

### Azure Dashboard Creation

- Create environment-specific monitoring dashboards
- Implement executive summary dashboards
- Set up application-specific monitoring views
- Create infrastructure health dashboards
- Configure user-specific dashboard access

### Custom Visualization

- Use Azure Monitor Workbooks for advanced reporting
- Implement Grafana integration for custom dashboards
- Create Power BI reports for business metrics
- Set up automated report generation and distribution
- Configure dashboard sharing and collaboration

## Capacity Planning and Forecasting

### Resource Utilization Analysis

- Monitor historical resource usage trends
- Implement predictive analytics for capacity planning
- Track seasonal usage patterns
- Monitor growth trends and scaling requirements
- Set up capacity alerts and recommendations

### Performance Baseline

- Establish performance baselines for applications
- Monitor deviation from baseline performance
- Track performance impact of changes
- Implement automated performance regression detection
- Document performance expectations and SLAs

## Security Monitoring

### Security Information and Event Management (SIEM)

- Integrate with Azure Sentinel for security monitoring
- Configure security event correlation rules
- Monitor authentication and authorization events
- Track privileged access and administrative actions
- Implement threat intelligence integration

### Compliance Monitoring

- Monitor compliance with regulatory requirements
- Track audit log events for compliance reporting
- Configure data retention policies for audit logs
- Implement automated compliance reporting
- Monitor security control effectiveness

## Cost Monitoring and Optimization

### Cost Analysis Integration

- Monitor resource costs using Azure Cost Management
- Set up cost alerts and budgets
- Track cost trends and anomalies
- Implement cost allocation using resource tags
- Monitor optimization opportunities

### Resource Efficiency Monitoring

- Track resource utilization vs. cost
- Monitor idle and underutilized resources
- Implement right-sizing recommendations
- Track cost impact of scaling decisions
- Monitor reserved instance utilization

## Automation and Response

### Automated Remediation

- Implement auto-scaling based on metrics
- Configure automatic failover for critical services
- Set up automated backup and recovery procedures
- Implement self-healing infrastructure patterns
- Configure automated security response actions

### Integration with DevOps

- Integrate monitoring with CI/CD pipelines
- Implement deployment health checks
- Configure automated rollback triggers
- Monitor deployment success and failure rates
- Track lead time and deployment frequency

## Documentation and Knowledge Management

### Monitoring Runbooks

- Document monitoring procedures and playbooks
- Create troubleshooting guides for common issues
- Maintain contact information for escalation
- Document system architecture and dependencies
- Keep monitoring configuration documentation current

### Training and Skills Development

- Provide monitoring tools training for operations teams
- Document best practices and lessons learned
- Share monitoring knowledge across teams
- Regular review and improvement of monitoring practices
- Stay current with new Azure monitoring features

## Monitoring Best Practices

- Implement monitoring as code using Infrastructure as Code
- Use consistent naming conventions for monitoring resources
- Implement proper monitoring resource lifecycle management
- Regular testing of monitoring and alerting systems
- Document monitoring decisions and trade-offs
- Implement monitoring for monitoring (meta-monitoring)
- Consider performance impact of monitoring overhead
- Plan for monitoring in disaster recovery scenarios
