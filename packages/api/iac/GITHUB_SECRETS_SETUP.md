# GitHub Secrets Setup Guide

## Required Secrets for PR Deployment Workflow

The PR deployment workflow uses **federated credentials** for passwordless authentication to Azure. You need to configure the following secrets in your GitHub repository.

### Navigate to Repository Secrets

1. Go to your GitHub repository: `https://github.com/play14team/play14-api`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Required Secrets

#### 1. AZURE_CLIENT_ID
- **Value**: `fb6acc6d-3658-4795-8d1c-8499bcd36760`
- **Description**: The application (client) ID of the `play14-github-actions` service principal

#### 2. AZURE_TENANT_ID
- **Value**: Your Azure tenant ID (GUID format)
- **How to get it**:
  ```powershell
  az account show --query tenantId -o tsv
  ```

#### 3. AZURE_SUBSCRIPTION_ID
- **Value**: Your Azure subscription ID (GUID format)
- **How to get it**:
  ```powershell
  az account show --query id -o tsv
  ```

#### 4. PLAY14API_REGISTRY_USERNAME
- **Value**: `play14containerregistry`
- **Description**: Container registry username (already configured)

#### 5. PLAY14API_REGISTRY_PASSWORD
- **Value**: ACR admin password
- **How to get it**:
  ```powershell
  az acr credential show -n play14containerregistry --query "passwords[0].value" -o tsv
  ```

#### 6. STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN
- **Value**: Your Mapbox access token
- **Description**: Required for building the Docker image (already configured)

## Verification

After adding the secrets, you can verify the federated credentials are set up correctly:

```powershell
# List federated credentials for the service principal
az ad app federated-credential list --id fb6acc6d-3658-4795-8d1c-8499bcd36760

# Should show:
# - play14-api-pr (for pull requests)
# - play14-api-main (for main branch)
```

## How Federated Credentials Work

1. **No Secrets Stored**: The workflow uses OpenID Connect (OIDC) to authenticate
2. **GitHub Issues Token**: GitHub provides a short-lived token proving the workflow identity
3. **Azure Validates**: Azure validates the token matches the federated credential configuration
4. **Access Granted**: If valid, Azure grants access without passwords

### Federated Credential Configuration

**PR Deployments** (`play14-api-pr`):
- **Issuer**: `https://token.actions.githubusercontent.com`
- **Subject**: `repo:play14team/play14-api:pull_request`
- **Audiences**: `api://AzureADTokenExchange`

**Main Branch** (`play14-api-main`):
- **Issuer**: `https://token.actions.githubusercontent.com`
- **Subject**: `repo:play14team/play14-api:ref:refs/heads/main`
- **Audiences**: `api://AzureADTokenExchange`

## Testing

After configuring secrets:

1. Create a test pull request
2. The workflow should:
   - Build the Docker image
   - Authenticate to Azure using federated credentials
   - Deploy to `play14-api-acc` container app
   - Comment on the PR with deployment URL

## Troubleshooting

### Workflow fails with "Login failed"

**Check**:
1. Federated credentials exist:
   ```powershell
   az ad app federated-credential list --id fb6acc6d-3658-4795-8d1c-8499bcd36760
   ```
2. Secrets are correctly set in GitHub
3. Service principal has correct permissions on resource group

### Workflow doesn't trigger

**Check**:
1. Workflow file is on the `main` branch
2. PR is targeting the `main` branch
3. PR action is one of: `opened`, `synchronize`, `reopened`, or `closed`

### Container app deployment fails

**Check**:
1. Container app `play14-api-acc` exists
2. Service principal has Contributor role on resource group
3. System-assigned managed identity has AcrPull role

## Quick Setup Script

```powershell
# Get the required values
$tenantId = az account show --query tenantId -o tsv
$subscriptionId = az account show --query id -o tsv
$clientId = "fb6acc6d-3658-4795-8d1c-8499bcd36760"
$acrPassword = az acr credential show -n play14containerregistry --query "passwords[0].value" -o tsv

Write-Host "Add these secrets to GitHub repository settings:"
Write-Host "AZURE_CLIENT_ID: $clientId"
Write-Host "AZURE_TENANT_ID: $tenantId"
Write-Host "AZURE_SUBSCRIPTION_ID: $subscriptionId"
Write-Host "PLAY14API_REGISTRY_PASSWORD: $acrPassword"
```

## Migration Note

This setup replaces the old `PLAY14API_AZURE_CREDENTIALS` secret (JSON service principal credentials) with individual secrets for federated authentication. The old secret can be removed after verifying the new setup works.
