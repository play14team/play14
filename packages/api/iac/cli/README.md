# Container App Deployment Scripts

## Overview

This directory contains PowerShell scripts for provisioning and managing Azure Container Apps for the play14-api project.

## Scripts

### `provision-acc.ps1`

Provisions the `play14-api-acc` container app in the acceptance environment.

**Features:**
- Creates federated credentials for GitHub Actions (PR and main branch)
- Deploys container app using Bicep templates
- Configures custom domain `community.acc.play14.org`
- Uses system-assigned managed identity for ACR authentication
- Configures all environment variables and secrets

**Usage:**

```powershell
# Deploy the container app
.\provision-acc.ps1

# Preview changes without deploying (what-if mode)
.\provision-acc.ps1 -WhatIf

# Custom resource group
.\provision-acc.ps1 -ResourceGroup "my-resource-group"
```

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ResourceGroup` | `play14-community` | Azure resource group name |
| `ParametersFile` | `../bicep/parameters/acc.parameters.json` | Path to parameters file |
| `ServicePrincipalAppId` | `fb6acc6d-3658-4795-8d1c-8499bcd36760` | Service principal app ID |
| `GitHubOrg` | `play14team` | GitHub organization |
| `GitHubRepo` | `play14-api` | GitHub repository |
| `WhatIf` | `false` | Preview changes without deploying |

**Prerequisites:**
- Azure CLI installed and logged in (`az login`)
- Contributor access to the resource group
- Owner/Application Administrator rights for service principal configuration

## Bicep Templates

### Main Template: `iac/main.bicep`

The main Bicep template provisions:
- Azure Container App with system-assigned managed identity
- Container app configuration (ingress, scaling, environment variables)
- Custom domain binding with certificate
- Secrets management
- AcrPull role assignment for the managed identity

### Parameters: `iac/bicep/parameters/acc.parameters.json`

Contains all configuration for the acceptance environment:
- Container app name: `play14-api-acc`
- Custom domain: `community.acc.play14.org`
- Database configuration (PostgreSQL)
- Storage configuration (Azure Blob Storage)
- All secrets (database password, JWT secrets, API tokens, etc.)

## Federated Credentials

The script creates two federated credentials for GitHub Actions:

1. **Pull Requests**: `play14-api-pr`
   - Subject: `repo:play14team/play14-api:pull_request`
   - Used for PR deployments to acceptance

2. **Main Branch**: `play14-api-main`
   - Subject: `repo:play14team/play14-api:ref:refs/heads/main`
   - Used for production deployments

These credentials enable GitHub Actions to authenticate to Azure without storing service principal secrets.

## GitHub Actions Integration

The PR deployment workflow (`.github/workflows/pr-deployment.yml`) uses the new container app:

- Builds and pushes Docker images with PR-specific tags
- Deploys to `play14-api-acc` container app
- Scales up the app (min=1, max=1) during deployment
- Scales down the app (min=0, max=0) when PR is closed

## Manual Deployment

To deploy manually using Azure CLI:

```powershell
# Validate the template
az deployment group validate `
  --resource-group play14-community `
  --template-file ../main.bicep `
  --parameters '@../bicep/parameters/acc.parameters.json'

# Deploy
az deployment group create `
  --resource-group play14-community `
  --template-file ../main.bicep `
  --parameters '@../bicep/parameters/acc.parameters.json' `
  --name "play14-api-acc-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
```

## Troubleshooting

### Federated Credential Errors

If you see errors about federated credentials already existing:
```powershell
# List existing credentials
az ad app federated-credential list --id fb6acc6d-3658-4795-8d1c-8499bcd36760

# Delete a credential if needed
az ad app federated-credential delete --id fb6acc6d-3658-4795-8d1c-8499bcd36760 --federated-credential-id <credential-name>
```

### Container App Not Starting

Check logs:
```powershell
az containerapp logs show -n play14-api-acc -g play14-community --follow
```

Check revision status:
```powershell
az containerapp revision list -n play14-api-acc -g play14-community -o table
```

### Custom Domain Issues

Verify certificate:
```powershell
az containerapp env certificate list -n play14-container-env -g play14-community
```

Update domain binding:
```powershell
az containerapp hostname bind -n play14-api-acc -g play14-community --hostname community.acc.play14.org --certificate <certificate-name>
```

## Next Steps

After provisioning:

1. **Update DNS**: Point `community.acc.play14.org` to the container app FQDN
2. **Test PR Workflow**: Open a PR to test automatic deployment
3. **Monitor**: Check container app logs and metrics in Azure Portal
4. **Scale**: Adjust min/max replicas in Bicep template if needed
