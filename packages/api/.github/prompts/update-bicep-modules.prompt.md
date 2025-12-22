## <!-- Based on: https://github.com/github/awesome-copilot/blob/main/prompts/update-avm-modules-in-bicep.prompt.md -->

mode: 'agent'
description: 'Update Azure Verified Modules (AVM) to latest versions in Bicep templates'
tools: ['edit/editFiles', 'codebase', 'fetch', 'runCommands']

---

# Update Bicep Modules

Your goal is to update Azure Verified Modules (AVM) and custom Bicep modules to their latest versions while ensuring compatibility and following best practices.

## Process Overview

### Step 1: Scan Existing Modules

Identify all Bicep modules currently used in the project:

- Extract AVM modules using pattern `avm/res/{service}/{resource}`
- Identify custom modules in the modules directory
- Document current versions and configurations
- Check for any deprecated modules or patterns

### Step 2: Version Discovery

Check latest versions for each module:

**Azure Verified Modules**:

```powershell
# Check latest AVM module versions using MCR API
$module = "avm/res/storage/storage-account"
$response = Invoke-RestMethod -Uri "https://mcr.microsoft.com/v2/bicep/$module/tags/list"
$latestVersion = ($response.tags | Sort-Object {[version]$_} -Descending)[0]
```

**Custom Modules**:

- Review custom module changelogs
- Check for breaking changes in module interfaces
- Validate parameter compatibility

### Step 3: Compatibility Analysis

For each module update, analyze:

- Breaking changes in module parameters
- New required parameters
- Deprecated parameter warnings
- Security and compliance improvements
- Performance optimizations

### Step 4: Update Implementation

**Safe Updates (Non-Breaking)**:

- Update version references automatically
- Update parameter names if changed
- Add new optional parameters with appropriate defaults
- Test template compilation

**Breaking Updates**:

- ⚠️ **PAUSE for approval** before implementing
- Document required parameter changes
- Plan migration strategy for breaking changes
- Test thoroughly in non-production environment

## Module Update Categories

### Azure Verified Modules (AVM)

**Common AVM Modules**:

- `avm/res/storage/storage-account`
- `avm/res/web/site`
- `avm/res/sql/server`
- `avm/res/key-vault/vault`
- `avm/res/network/virtual-network`
- `avm/res/compute/virtual-machine`

**Update Process**:

1. Check module registry for latest version
2. Review module documentation for changes
3. Update version reference in Bicep template
4. Validate template syntax and compilation
5. Test deployment in development environment

### Custom Modules

**Update Considerations**:

- Maintain backward compatibility where possible
- Document API changes in module documentation
- Version custom modules appropriately
- Test module consumers after updates

## Validation and Testing

### Template Validation

```powershell
# Validate Bicep template after module updates
bicep build main.bicep

# Check for any compilation errors or warnings
bicep lint main.bicep

# Validate deployment template
az deployment group validate --resource-group $rgName --template-file main.bicep --parameters @parameters.json
```

### Breaking Change Detection

**Parameters to Check**:

- Required vs. optional parameter changes
- Parameter type changes
- Default value modifications
- New security requirements

**Security Considerations**:

- Review security parameter changes
- Check for new compliance requirements
- Validate network security configurations
- Review access control changes

### Deployment Testing

1. **Development Environment**:

   - Deploy updated templates to development
   - Validate resource configurations
   - Test application functionality
   - Check monitoring and logging

2. **Staging Environment**:

   - Perform what-if deployment analysis
   - Deploy with careful monitoring
   - Run integration tests
   - Validate performance metrics

3. **Production Deployment**:
   - Schedule maintenance window if needed
   - Implement gradual rollout strategy
   - Monitor deployment progress
   - Have rollback plan ready

## Documentation and Communication

### Update Documentation

- Document version changes and reasons
- Update parameter documentation
- Note any breaking changes or migration steps
- Update deployment procedures if changed

### Change Communication

- Notify stakeholders of significant updates
- Document risk assessment for breaking changes
- Provide migration timeline for deprecated features
- Share testing results and validation outcomes

## Output Format

Display update results in table format:

```markdown
| Module                          | Current | Latest | Status | Action        | Notes                                   |
| ------------------------------- | ------- | ------ | ------ | ------------- | --------------------------------------- |
| avm/res/storage/storage-account | 0.1.0   | 0.2.0  | 🔄     | Updated       | Added new security parameters           |
| avm/res/web/site                | 0.3.0   | 0.3.0  | ✅     | Current       | No updates available                    |
| modules/custom-network          | 1.0.0   | 1.1.0  | ⚠️     | Manual Review | Breaking changes in parameter structure |

### Summary of Updates

**Successfully Updated**: 2 modules
**Current/No Updates**: 1 module  
**Requires Manual Review**: 1 module

**Breaking Changes Detected**:

- Custom network module: Parameter structure changed for subnet configuration
- Requires approval before implementation

**Security Improvements**:

- Storage account module: Added private endpoint configuration options
- Enhanced encryption parameters available
```

## Icons Reference

- 🔄 Updated successfully
- ✅ Already current
- ⚠️ Manual review required (breaking changes)
- ❌ Update failed
- 📖 Documentation link

## Best Practices

- Always backup current templates before major updates
- Use semantic versioning for custom modules
- Test updates in isolated environments first
- Document all parameter changes and migrations
- Keep update logs for audit and rollback purposes
- Schedule regular module update reviews
- Monitor Azure announcements for security updates

Provide the Bicep template file or directory you'd like me to analyze and update!
