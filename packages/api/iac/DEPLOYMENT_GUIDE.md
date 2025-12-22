# play14-api-acc Container App Deployment Guide

## Overview

This guide covers deploying the `play14-api-acc` container app to Azure Container Apps using Bicep templates and PowerShell scripts.

## Architecture

- **Container App**: `play14-api-acc`
- **Resource Group**: `play14-community`
- **Container Environment**: `play14-container-env`
- **Custom Domain**: `community.acc.play14.org`
- **Authentication**: System-assigned managed identity + Service Principal for GitHub Actions
- **Registry**: `play14containerregistry.azurecr.io`
- **Database**: PostgreSQL (`play14-pg.postgres.database.azure.com/play14_acc`)
- **Storage**: Azure Blob Storage (`play14storage/strapi-uploads`)

## Files Created

### Bicep Templates
- **[iac/main.bicep](main.bicep)**: Main template for container app provisioning
- **[iac/bicep/parameters/acc.parameters.json](bicep/parameters/acc.parameters.json)**: Parameters for acceptance environment

### PowerShell Scripts
- **[iac/cli/provision-acc.ps1](cli/provision-acc.ps1)**: Main provisioning script
- **[iac/cli/validate-deployment.ps1](cli/validate-deployment.ps1)**: Pre-deployment validation script

### Documentation
- **[iac/cli/README.md](cli/README.md)**: Detailed CLI scripts documentation

### GitHub Actions
- **[.github/workflows/pr-deployment.yml](../.github/workflows/pr-deployment.yml)**: Updated to use `play14-api-acc`

## Key Features

### 1. Federated Credentials (Passwordless Authentication)

The provisioning script creates two federated credentials for GitHub Actions:

- **PR Deployments**: `repo:play14team/play14-api:pull_request`
- **Main Branch**: `repo:play14team/play14-api:ref:refs/heads/main`

These enable GitHub Actions to authenticate to Azure without storing secrets.

### 2. System-Assigned Managed Identity

The container app uses a system-assigned managed identity with:
- **AcrPull** role for pulling images from the container registry
- No password/secret required for ACR authentication

### 3. Custom Domain with Certificate

- Domain: `community.acc.play14.org`
- Certificate: CloudFlare Origin Certificate (already provisioned)
- SNI binding enabled

### 4. Environment Variables & Secrets

All Strapi configuration is injected via environment variables:
- Database credentials (PostgreSQL)
- JWT secrets and API tokens
- Storage account keys
- Mapbox access token
- GitHub token for triggering UI rebuilds

## Deployment Steps

### Step 1: Validate Prerequisites

```powershell
cd iac/cli
.\validate-deployment.ps1
```

This checks:
- Azure login status
- Resource group exists
- Container environment exists
- Certificate exists
- Service principal exists
- Container registry access
- Parameters file is valid
- Bicep template builds successfully

### Step 2: Preview Changes (What-If)

```powershell
.\provision-acc.ps1 -WhatIf
```

This shows what resources will be created/modified without actually deploying.

### Step 3: Deploy

```powershell
.\provision-acc.ps1
```

The script will:
1. Create/update federated credentials
2. Validate Bicep template
3. Deploy container app
4. Configure custom domain
5. Assign AcrPull role to managed identity
6. Display deployment outputs

### Step 4: Verify Deployment

```powershell
# Check container app status
az containerapp show -n play14-api-acc -g play14-community --query "properties.provisioningState"

# View logs
az containerapp logs show -n play14-api-acc -g play14-community --follow

# Get URLs
az containerapp show -n play14-api-acc -g play14-community --query "properties.configuration.ingress.fqdn"
```

## GitHub Actions Integration

The PR deployment workflow now uses `play14-api-acc`:

```yaml
env:
  CONTAINER_APP_ACC: play14-api-acc
```

### Workflow Behavior

1. **PR Opened/Updated**:
   - Builds Docker image with tags `pr-{number}` and `pr-{number}-{sha}`
   - Scales up container app (min=1, max=1)
   - Deploys PR image to acceptance
   - Comments PR with deployment URL

2. **PR Closed**:
   - Scales down container app (min=0, max=0)
   - Comments PR with stop notification

## Manual Operations

### Scale Container App

```powershell
# Scale up
az containerapp update -n play14-api-acc -g play14-community --min-replicas 1 --max-replicas 1

# Scale down
az containerapp update -n play14-api-acc -g play14-community --min-replicas 0 --max-replicas 0
```

### Update Container Image

```powershell
az containerapp update -n play14-api-acc -g play14-community --image play14containerregistry.azurecr.io/play14/play14-api:pr-62
```

### View Revisions

```powershell
az containerapp revision list -n play14-api-acc -g play14-community -o table
```

### Update Environment Variables

```powershell
az containerapp update -n play14-api-acc -g play14-community --set-env-vars "CRON_ENABLED=true"
```

### Restart Container App

```powershell
az containerapp revision restart -n play14-api-acc -g play14-community --revision <revision-name>
```

## DNS Configuration

After deployment, update DNS to point the custom domain to the container app:

1. Get the container app's default FQDN:
   ```powershell
   az containerapp show -n play14-api-acc -g play14-community --query "properties.configuration.ingress.fqdn" -o tsv
   ```

2. Create CNAME record:
   - **Name**: `community.acc`
   - **Type**: `CNAME`
   - **Value**: `<container-app-fqdn>` (from step 1)

3. If using Cloudflare:
   - Ensure SSL/TLS mode is set to "Full" or "Full (strict)"
   - Orange cloud (proxied) can be enabled

## Troubleshooting

### Container App Not Starting

```powershell
# Check revision status
az containerapp revision list -n play14-api-acc -g play14-community

# View logs
az containerapp logs show -n play14-api-acc -g play14-community --tail 100

# Check events
az containerapp show -n play14-api-acc -g play14-community --query "properties.latestRevisionName"
```

### Image Pull Errors

```powershell
# Verify managed identity has AcrPull role
az role assignment list --assignee <managed-identity-principal-id> --scope /subscriptions/<subscription-id>/resourceGroups/play14-community/providers/Microsoft.ContainerRegistry/registries/play14containerregistry
```

### Custom Domain Issues

```powershell
# List certificates
az containerapp env certificate list -n play14-container-env -g play14-community

# Update domain binding
az containerapp hostname bind -n play14-api-acc -g play14-community --hostname community.acc.play14.org --certificate community.acc.play14.org --environment play14-container-env
```

### Federated Credential Errors

```powershell
# List federated credentials
az ad app federated-credential list --id fb6acc6d-3658-4795-8d1c-8499bcd36760

# Delete and recreate if needed
az ad app federated-credential delete --id fb6acc6d-3658-4795-8d1c-8499bcd36760 --federated-credential-id play14-api-pr
az ad app federated-credential delete --id fb6acc6d-3658-4795-8d1c-8499bcd36760 --federated-credential-id play14-api-main
```

## Monitoring

### Application Insights

Container Apps logs are automatically sent to the environment's Log Analytics workspace.

Query logs:
```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "play14-api-acc"
| order by TimeGenerated desc
| take 100
```

### Metrics

View metrics in Azure Portal:
- CPU usage
- Memory usage
- HTTP requests
- Response times

## Security Considerations

1. **Secrets Management**: All secrets are stored as Container App secrets (encrypted at rest)
2. **Network Security**: Ingress is external with HTTPS only (allowInsecure: false)
3. **Identity**: System-assigned managed identity for Azure resource access
4. **Authentication**: Federated credentials for GitHub Actions (no secrets stored in GitHub)
5. **Certificate**: CloudFlare Origin Certificate for custom domain

## Cost Optimization

The container app is configured for cost efficiency:
- **Default State**: Scaled to 0 replicas (no cost when not in use)
- **PR Deployments**: Scaled to 1 replica only during active PR testing
- **Auto-stop**: Automatically scaled down when PR is closed
- **Resources**: Minimal allocation (0.25 CPU, 0.5Gi memory)

## Next Steps

1. ✅ Bicep template created
2. ✅ Parameters file updated
3. ✅ Provisioning script created
4. ✅ Validation script created
5. ✅ PR workflow updated
6. ⏳ Run validation: `.\validate-deployment.ps1`
7. ⏳ Deploy: `.\provision-acc.ps1`
8. ⏳ Update DNS for custom domain
9. ⏳ Test with a PR deployment

## Support

For issues or questions:
- Check [iac/cli/README.md](cli/README.md) for detailed CLI documentation
- Review Azure Container Apps logs
- Check GitHub Actions workflow runs
- Validate Bicep template: `az bicep build --file main.bicep`
