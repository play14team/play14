---
applyTo: "**/*.bicep, **/*.json, **/iac/**"
description: "Azure security best practices for infrastructure as code"
---

# Azure Infrastructure Security Best Practices

## Identity and Access Management

- Use managed identities for Azure resource authentication
- Implement principle of least privilege for all resource access
- Use Azure Active Directory integration for user authentication
- Configure proper role-based access control (RBAC) assignments
- Avoid storing credentials in template parameters or variables

## Network Security

- Implement network segmentation using virtual networks and subnets
- Configure network security groups (NSGs) with restrictive rules
- Use private endpoints for Azure services to avoid internet exposure
- Implement Azure Firewall or network virtual appliances for traffic filtering
- Configure secure connectivity using VPN or ExpressRoute

## Data Protection

- Enable encryption at rest for all data services
- Use Azure Key Vault for secrets, keys, and certificate management
- Implement encryption in transit using HTTPS/TLS
- Configure appropriate backup and disaster recovery solutions
- Use Azure Confidential Computing for sensitive workloads

## Resource Security Configuration

### Storage Accounts

- Disable public blob access unless specifically required
- Configure storage firewalls and virtual network rules
- Enable secure transfer requirements (HTTPS only)
- Use managed identity for storage account access
- Implement blob versioning and soft delete

### Database Security

- Configure firewall rules to restrict database access
- Use private endpoints for database connectivity
- Enable transparent data encryption (TDE)
- Implement proper backup encryption
- Use managed identity for database authentication

### Container Security

- Use private container registries
- Scan container images for vulnerabilities
- Implement security contexts and pod security policies
- Use managed identity for container registry access
- Configure network policies for container communication

## Key Vault Integration

- Store all sensitive configuration in Azure Key Vault
- Use Key Vault references in Bicep templates
- Configure proper access policies and RBAC for Key Vault
- Enable Key Vault soft delete and purge protection
- Implement Key Vault networking restrictions

## Monitoring and Auditing

- Enable Azure Activity Log for all subscriptions
- Configure diagnostic settings for all resources
- Use Azure Security Center for security recommendations
- Implement Azure Sentinel for security information and event management (SIEM)
- Set up alerts for security-related events

## Compliance and Governance

- Use Azure Policy to enforce security standards
- Implement resource tagging for governance and compliance
- Configure Azure Blueprints for consistent deployments
- Use Azure Cost Management for cost governance
- Implement proper change management processes

## Infrastructure as Code Security

### Template Security

- Never include secrets or passwords in Bicep templates
- Use secure parameters for sensitive values
- Validate template inputs using decorators
- Implement proper error handling without exposing sensitive information
- Use latest API versions for security features

### Deployment Security

- Use service principals with minimal permissions for deployments
- Implement approval workflows for production deployments
- Store deployment artifacts securely
- Audit deployment history and changes
- Use what-if deployments to preview security changes

## Security Testing

- Include security validation in deployment pipelines
- Use security scanning tools for infrastructure code
- Test network connectivity and access controls
- Validate encryption configurations
- Perform penetration testing on deployed infrastructure

## Incident Response

- Implement security incident response procedures
- Configure automated responses to security events
- Maintain contact information for security incidents
- Document and test incident response playbooks
- Implement forensic capabilities for security investigations

## Regular Security Reviews

- Conduct regular security assessments of infrastructure
- Review and update security configurations
- Monitor security advisories and apply updates
- Perform access reviews and remove unnecessary permissions
- Update security documentation and procedures

## Common Security Anti-Patterns to Avoid

- Storing secrets in source code or templates
- Using shared accounts instead of managed identities
- Exposing services to the internet without proper protection
- Not implementing network segmentation
- Ignoring security center recommendations
- Using outdated API versions without security features
- Not monitoring and auditing resource access
- Implementing overly permissive access controls
