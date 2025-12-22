#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Provisions the play14-api-acc container app with federated credentials for GitHub Actions.

.DESCRIPTION
    This script:
    1. Creates federated credentials for the play14-github-actions service principal
    2. Deploys the container app using Bicep templates
    3. Configures custom domain binding

.PARAMETER ResourceGroup
    The Azure resource group name. Default: play14-community

.PARAMETER ParametersFile
    Path to the parameters file. Default: ../bicep/parameters/acc.parameters.json

.PARAMETER ServicePrincipalAppId
    The service principal application ID. Default: fb6acc6d-3658-4795-8d1c-8499bcd36760

.PARAMETER GitHubOrg
    GitHub organization name. Default: play14team

.PARAMETER GitHubRepo
    GitHub repository name. Default: play14-api

.PARAMETER WhatIf
    If specified, shows what would be deployed without actually deploying.

.EXAMPLE
    .\provision-acc.ps1

.EXAMPLE
    .\provision-acc.ps1 -WhatIf

.EXAMPLE
    .\provision-acc.ps1 -ResourceGroup "play14-community" -GitHubRepo "play14-api"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "play14-community",

    [Parameter(Mandatory = $false)]
    [string]$ParametersFile = "$PSScriptRoot\..\bicep\parameters\acc.parameters.json",

    [Parameter(Mandatory = $false)]
    [string]$ServicePrincipalAppId = "fb6acc6d-3658-4795-8d1c-8499bcd36760",

    [Parameter(Mandatory = $false)]
    [string]$GitHubOrg = "play14team",

    [Parameter(Mandatory = $false)]
    [string]$GitHubRepo = "play14-api",

    [Parameter(Mandatory = $false)]
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}
function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}
function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

Write-Info "Starting provisioning of play14-api-acc container app..."
Write-Info "Resource Group: $ResourceGroup"
Write-Info "Parameters File: $ParametersFile"
Write-Info "Service Principal: $ServicePrincipalAppId"
Write-Info "GitHub: $GitHubOrg/$GitHubRepo"

# Check if logged in to Azure
Write-Info "Checking Azure login status..."
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    }
    Write-Success "Logged in as: $($account.user.name)"
    Write-Info "Subscription: $($account.name) ($($account.id))"
}
catch {
    Write-Error "Not logged in to Azure. Please run 'az login' first."
    exit 1
}

# Validate parameters file exists
if (-not (Test-Path $ParametersFile)) {
    Write-Error "Parameters file not found: $ParametersFile"
    exit 1
}

Write-Success "Parameters file found: $ParametersFile"

# Step 1: Configure Federated Credentials for GitHub Actions
Write-Info "Configuring federated credentials for GitHub Actions..."

# Get the service principal object ID
$spObjectId = (az ad sp show --id $ServicePrincipalAppId --query "id" -o tsv)
if (-not $spObjectId) {
    Write-Error "Service principal not found: $ServicePrincipalAppId"
    exit 1
}

Write-Success "Service Principal Object ID: $spObjectId"

# Federated credential for Pull Requests
$prCredentialName = "$GitHubRepo-pr"
$prSubject = "repo:$GitHubOrg/$GitHubRepo:pull_request"

Write-Info "Creating federated credential for PRs: $prCredentialName"
Write-Info "  Subject: $prSubject"

if (-not $WhatIf) {
    # Check if credential already exists
    $existingPrCred = az ad app federated-credential list --id $ServicePrincipalAppId --query "[?name=='$prCredentialName'].name" -o tsv 2>$null

    # Create JSON using PowerShell object and write to temp file
    $prCredentialParams = @{
        name        = $prCredentialName
        issuer      = "https://token.actions.githubusercontent.com"
        subject     = $prSubject
        description = "GitHub Actions PR deployments for $GitHubRepo"
        audiences   = @("api://AzureADTokenExchange")
    }

    $tempFile = [System.IO.Path]::GetTempFileName()
    $prCredentialParams | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile -Encoding UTF8

    try {
        if ($existingPrCred) {
            Write-Warning "Federated credential '$prCredentialName' already exists. Updating..."
            az ad app federated-credential update `
                --id $ServicePrincipalAppId `
                --federated-credential-id $prCredentialName `
                --parameters "@$tempFile" 2>$null
        }
        else {
            az ad app federated-credential create `
                --id $ServicePrincipalAppId `
                --parameters "@$tempFile"
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Success "PR federated credential configured successfully"
        }
        else {
            Write-Warning "Failed to configure PR federated credential (may already exist)"
        }
    }
    finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}

# Federated credential for Main branch
$mainCredentialName = "$GitHubRepo-main"
$mainSubject = "repo:$GitHubOrg/$GitHubRepo:ref:refs/heads/main"

Write-Info "Creating federated credential for main branch: $mainCredentialName"
Write-Info "  Subject: $mainSubject"

if (-not $WhatIf) {
    # Check if credential already exists
    $existingMainCred = az ad app federated-credential list --id $ServicePrincipalAppId --query "[?name=='$mainCredentialName'].name" -o tsv 2>$null

    # Create JSON using PowerShell object and write to temp file
    $mainCredentialParams = @{
        name        = $mainCredentialName
        issuer      = "https://token.actions.githubusercontent.com"
        subject     = $mainSubject
        description = "GitHub Actions main branch deployments for $GitHubRepo"
        audiences   = @("api://AzureADTokenExchange")
    }

    $tempFile = [System.IO.Path]::GetTempFileName()
    $mainCredentialParams | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile -Encoding UTF8

    try {
        if ($existingMainCred) {
            Write-Warning "Federated credential '$mainCredentialName' already exists. Updating..."
            az ad app federated-credential update `
                --id $ServicePrincipalAppId `
                --federated-credential-id $mainCredentialName `
                --parameters "@$tempFile" 2>$null
        }
        else {
            az ad app federated-credential create `
                --id $ServicePrincipalAppId `
                --parameters "@$tempFile"
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Main branch federated credential configured successfully"
        }
        else {
            Write-Warning "Failed to configure main branch federated credential (may already exist)"
        }
    }
    finally {
        Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
    }
}

# Step 2: Validate Bicep template
Write-Info "Validating Bicep template..."
$bicepFile = "$PSScriptRoot\..\main.bicep"

if (-not (Test-Path $bicepFile)) {
    Write-Error "Bicep template not found: $bicepFile"
    exit 1
}

if ($WhatIf) {
    Write-Info "Running validation (what-if mode)..."
    az deployment group what-if `
        --resource-group $ResourceGroup `
        --template-file $bicepFile `
        --parameters "@$ParametersFile"

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Validation successful!"
        Write-Info "Run without -WhatIf to deploy the changes."
    }
    else {
        Write-Error "Validation failed!"
        exit 1
    }
}
else {
    # Step 3: Deploy the container app
    Write-Info "Deploying container app using Bicep..."

    $deploymentName = "play14-api-acc-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

    az deployment group create `
        --resource-group $ResourceGroup `
        --template-file $bicepFile `
        --parameters "@$ParametersFile" `
        --name $deploymentName `
        --verbose

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Deployment successful!"

        # Get deployment outputs
        Write-Info "Retrieving deployment outputs..."
        $outputs = az deployment group show `
            --resource-group $ResourceGroup `
            --name $deploymentName `
            --query "properties.outputs" `
            -o json | ConvertFrom-Json

        if ($outputs) {
            Write-Success "Container App deployed successfully!"
            Write-Info "Container App Name: $($outputs.containerAppName.value)"
            Write-Info "Default URL: $($outputs.containerAppUrl.value)"

            if ($outputs.customDomainUrl.value) {
                Write-Info "Custom Domain: $($outputs.customDomainUrl.value)"
            }
        }
    }
    else {
        Write-Error "Deployment failed!"
        exit 1
    }
}

Write-Success "Provisioning complete!"
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Update DNS to point community.acc.play14.org to the container app"
Write-Info "2. Update GitHub Actions workflow to use the new app name: play14-api-acc"
Write-Info "3. Test the deployment with a PR"
