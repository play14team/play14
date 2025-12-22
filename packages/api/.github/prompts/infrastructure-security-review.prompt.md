---
mode: "agent"
description: "Perform comprehensive security review of Azure infrastructure templates and configurations"
tools: ["edit/editFiles", "codebase", "fetch", "runCommands"]
---

# Infrastructure Security Review

Your goal is to perform a comprehensive security review of Azure infrastructure templates, configurations, and deployments following Azure security best practices and compliance requirements.

## Security Review Scope

### Infrastructure as Code Security

**Bicep Template Security**:

- Review parameter security and validation
- Check for hardcoded secrets or sensitive values
- Validate resource access controls and permissions
- Review network security configurations
- Check encryption settings and key management

**Template Best Practices**:

- Ensure proper use of secure parameters
- Validate resource naming and tagging
- Check for latest API versions with security features
- Review conditional deployments and environment handling
- Validate template outputs for information disclosure

### Azure Resource Security

**Identity and Access Management**:

- Review managed identity configurations
- Validate role-based access control (RBAC) assignments
- Check Azure Active Directory integration
- Review service principal permissions
- Validate Key Vault access policies

**Network Security**:

- Review network security group (NSG) rules
- Validate virtual network and subnet configurations
- Check private endpoint implementations
- Review firewall and application gateway configurations
- Validate network segmentation and isolation

**Data Protection**:

- Review encryption at rest configurations
- Validate encryption in transit settings
- Check backup and disaster recovery security
- Review data classification and handling
- Validate compliance with data protection regulations

## Security Assessment Framework

### Critical Security Controls

**Authentication and Authorization**:

- ✅ Managed identities used for service-to-service authentication
- ✅ RBAC implemented with principle of least privilege
- ✅ Azure AD integration properly configured
- ✅ Service principals have minimal required permissions
- ✅ Multi-factor authentication enforced where applicable

**Network Security**:

- ✅ Network segmentation implemented using VNets and subnets
- ✅ Network security groups configured with restrictive rules
- ✅ Private endpoints used for Azure services
- ✅ Public access disabled where not required
- ✅ DDoS protection configured for public-facing resources

**Data Security**:

- ✅ Encryption at rest enabled for all data services
- ✅ Encryption in transit enforced (HTTPS/TLS)
- ✅ Key management using Azure Key Vault
- ✅ Backup encryption properly configured
- ✅ Data retention policies implemented

### High-Risk Security Issues

**Critical Issues (Must Fix)**:

- Hardcoded secrets or passwords in templates
- Public access enabled without justification
- Weak encryption configurations
- Overly permissive RBAC assignments
- Missing network security controls

**High Priority Issues**:

- Outdated API versions without security features
- Missing monitoring and auditing configurations
- Inadequate backup and disaster recovery
- Non-compliant resource configurations
- Missing security baseline implementations

**Medium Priority Issues**:

- Suboptimal network segmentation
- Missing resource tagging for governance
- Inconsistent naming conventions
- Missing cost management controls
- Limited monitoring coverage

## Security Review Process

### Step 1: Template Analysis

**Static Code Analysis**:

```powershell
# Validate Bicep templates for security issues
bicep build main.bicep --outfile main.json

# Use Azure Resource Manager Template Analyzer
arm-ttk -TemplatePath ./main.json

# Check for Azure Policy compliance
az policy compliance list --resource-group $resourceGroup
```

**Security Checklist Review**:

- No secrets in templates or parameters
- Secure parameters used for sensitive values
- Latest API versions with security features
- Proper resource dependencies and references
- Appropriate conditional logic for environments

### Step 2: Resource Configuration Review

**Azure Security Center Assessment**:

```powershell
# Get security recommendations
az security assessment list --resource-group $resourceGroup

# Check compliance with security standards
az security compliance list --scope "/subscriptions/$subscriptionId"

# Review security contacts and notifications
az security contact list
```

**Key Vault Integration**:

- Secrets stored in Key Vault, not in templates
- Proper access policies and RBAC configured
- Key rotation policies implemented
- Audit logging enabled
- Network access restrictions configured

### Step 3: Network Security Validation

**Network Configuration Review**:

```powershell
# Review network security groups
az network nsg list --resource-group $resourceGroup --query "[].{Name:name, Rules:securityRules[].{Name:name, Access:access, Direction:direction, Priority:priority}}"

# Check virtual network configurations
az network vnet list --resource-group $resourceGroup --query "[].{Name:name, Subnets:subnets[].name}"

# Validate private endpoints
az network private-endpoint list --resource-group $resourceGroup
```

**Security Controls Validation**:

- NSG rules follow least privilege principle
- Private endpoints implemented for Azure services
- Network segmentation properly configured
- DDoS protection enabled for public resources
- Web Application Firewall configured where applicable

### Step 4: Compliance and Governance

**Azure Policy Compliance**:

```powershell
# Check policy compliance state
az policy state list --resource-group $resourceGroup --query "[?complianceState=='NonCompliant'].{Policy:policyDefinitionName, Resource:resourceId}"

# Review policy assignments
az policy assignment list --resource-group $resourceGroup
```

**Governance Controls**:

- Resource tagging for compliance and cost allocation
- Naming conventions consistently applied
- Lifecycle management policies implemented
- Change management processes documented
- Audit logging and monitoring configured

## Security Recommendations

### Immediate Actions Required

**Critical Security Fixes**:

1. Remove any hardcoded secrets from templates
2. Enable encryption for all data services
3. Configure private endpoints for Azure services
4. Implement proper RBAC with least privilege
5. Enable security monitoring and alerting

**High Priority Improvements**:

1. Update to latest API versions with security features
2. Implement network segmentation and micro-segmentation
3. Configure backup encryption and retention policies
4. Enable Azure Security Center recommendations
5. Implement Key Vault for all secrets management

### Security Baseline Implementation

**Azure Security Benchmark Alignment**:

- Implement Microsoft Cloud Security Benchmark
- Configure security baselines for all resource types
- Enable continuous compliance monitoring
- Implement security incident response procedures
- Document security architecture and controls

**Industry Compliance**:

- Map controls to relevant compliance frameworks (SOC 2, ISO 27001, etc.)
- Implement compliance monitoring and reporting
- Document data flows and processing activities
- Configure audit logging for compliance requirements
- Implement data retention and deletion policies

## Monitoring and Continuous Improvement

### Security Monitoring Setup

**Azure Sentinel Integration**:

- Configure security information and event management (SIEM)
- Implement security playbooks and automated responses
- Set up threat intelligence integration
- Configure security incident response workflows
- Implement continuous threat hunting capabilities

**Security Metrics and Reporting**:

- Monitor security posture score
- Track security recommendation remediation
- Report on compliance status regularly
- Monitor security incidents and response times
- Track security training and awareness metrics

### Regular Security Reviews

**Scheduled Assessments**:

- Monthly security posture reviews
- Quarterly compliance assessments
- Annual penetration testing
- Regular threat modeling updates
- Continuous security awareness training

**Security Improvement Process**:

- Track security recommendation implementation
- Monitor emerging threats and vulnerabilities
- Update security controls based on threat landscape
- Regular security architecture reviews
- Continuous improvement of security processes

Provide your infrastructure templates or deployed resource details, and I'll perform a comprehensive security review with actionable recommendations!
