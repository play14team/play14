#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validates the deployment setup for play14-api-acc container app.

.DESCRIPTION
    This script checks:
    - Azure login status
    - Resource group exists
    - Container environment exists
    - Certificate exists
    - Service principal exists and has required roles
    - Parameters file is valid

.PARAMETER ResourceGroup
    The Azure resource group name. Default: play14-community

.PARAMETER ServicePrincipalAppId
    The service principal application ID. Default: fb6acc6d-3658-4795-8d1c-8499bcd36760

.EXAMPLE
    .\validate-deployment.ps1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "play14-community",

    [Parameter(Mandatory = $false)]
    [string]$ServicePrincipalAppId = "fb6acc6d-3658-4795-8d1c-8499bcd36760",

    [Parameter(Mandatory = $false)]
    [string]$ContainerEnvironment = "play14-container-env",

    [Parameter(Mandatory = $false)]
    [string]$CertificateName = "community.acc.play14.org",

    [Parameter(Mandatory = $false)]
    [string]$RegistryName = "play14containerregistry"
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

$validationErrors = 0

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  play14-api-acc Deployment Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Azure Login
Write-Info "Checking Azure login status..."
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Error "Not logged in to Azure"
        $validationErrors++
    }
    else {
        Write-Success "Logged in as: $($account.user.name)"
        Write-Info "  Subscription: $($account.name)"
        Write-Info "  Tenant: $($account.tenantId)"
    }
}
catch {
    Write-Error "Not logged in to Azure. Run 'az login'"
    $validationErrors++
}

# Check 2: Resource Group
Write-Info "Checking resource group: $ResourceGroup..."
$rg = az group show --name $ResourceGroup 2>$null | ConvertFrom-Json
if ($rg) {
    Write-Success "Resource group exists"
    Write-Info "  Location: $($rg.location)"
}
else {
    Write-Error "Resource group '$ResourceGroup' not found"
    $validationErrors++
}

# Check 3: Container Environment
Write-Info "Checking container environment: $ContainerEnvironment..."
$env = az containerapp env show --name $ContainerEnvironment --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
if ($env) {
    Write-Success "Container environment exists"
    Write-Info "  Location: $($env.location)"
    Write-Info "  Static IP: $($env.properties.staticIp)"
}
else {
    Write-Error "Container environment '$ContainerEnvironment' not found"
    $validationErrors++
}

# Check 4: Certificate
Write-Info "Checking certificate: $CertificateName..."
$certs = az containerapp env certificate list --name $ContainerEnvironment --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
$cert = $certs | Where-Object { $_.name -eq $CertificateName -or $_.properties.subjectName -eq $CertificateName }
if ($cert) {
    Write-Success "Certificate found"
    Write-Info "  Name: $($cert.name)"
    Write-Info "  Subject: $($cert.properties.subjectName)"
    Write-Info "  Expiration: $($cert.properties.expirationDate)"
}
else {
    Write-Error "Certificate '$CertificateName' not found in environment"
    Write-Info "Available certificates:"
    $certs | ForEach-Object { Write-Info "  - $($_.name) ($($_.properties.subjectName))" }
    $validationErrors++
}

# Check 5: Service Principal
Write-Info "Checking service principal: $ServicePrincipalAppId..."
$sp = az ad sp show --id $ServicePrincipalAppId 2>$null | ConvertFrom-Json
if ($sp) {
    Write-Success "Service principal exists"
    Write-Info "  Display Name: $($sp.displayName)"
    Write-Info "  Object ID: $($sp.id)"
}
else {
    Write-Error "Service principal '$ServicePrincipalAppId' not found"
    $validationErrors++
}

# Check 6: Federated Credentials
Write-Info "Checking federated credentials..."
$fedCreds = az ad app federated-credential list --id $ServicePrincipalAppId 2>$null | ConvertFrom-Json
if ($fedCreds) {
    $prCred = $fedCreds | Where-Object { $_.name -eq "play14-api-pr" }
    $mainCred = $fedCreds | Where-Object { $_.name -eq "play14-api-main" }

    if ($prCred) {
        Write-Success "PR federated credential exists: $($prCred.name)"
        Write-Info "  Subject: $($prCred.subject)"
    }
    else {
        Write-Warning "PR federated credential 'play14-api-pr' not found (will be created during deployment)"
    }

    if ($mainCred) {
        Write-Success "Main federated credential exists: $($mainCred.name)"
        Write-Info "  Subject: $($mainCred.subject)"
    }
    else {
        Write-Warning "Main federated credential 'play14-api-main' not found (will be created during deployment)"
    }
}
else {
    Write-Warning "No federated credentials found (will be created during deployment)"
}

# Check 7: Registry Access
Write-Info "Checking container registry: $RegistryName..."
$registry = az acr show --name $RegistryName --resource-group $ResourceGroup 2>$null | ConvertFrom-Json
if ($registry) {
    Write-Success "Container registry exists"
    Write-Info "  Login Server: $($registry.loginServer)"
    Write-Info "  SKU: $($registry.sku.name)"

    # Check if SP has AcrPush role
    $subscriptionId = $account.id
    $registryId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.ContainerRegistry/registries/$RegistryName"

    $roleAssignments = az role assignment list --assignee $ServicePrincipalAppId --scope $registryId 2>$null | ConvertFrom-Json
    $acrPushRole = $roleAssignments | Where-Object { $_.roleDefinitionName -eq "AcrPush" }

    if ($acrPushRole) {
        Write-Success "Service principal has AcrPush role on registry"
    }
    else {
        Write-Warning "Service principal does not have AcrPush role (may need manual assignment)"
        Write-Info "Run: az role assignment create --assignee $ServicePrincipalAppId --role AcrPush --scope $registryId"
    }
}
else {
    Write-Error "Container registry '$RegistryName' not found"
    $validationErrors++
}

# Check 8: Parameters File
Write-Info "Checking parameters file..."
$paramsFile = "$PSScriptRoot\..\bicep\parameters\acc.parameters.json"
if (Test-Path $paramsFile) {
    Write-Success "Parameters file exists"
    try {
        $params = Get-Content $paramsFile | ConvertFrom-Json
        Write-Info "  App Name: $($params.parameters.appName.value)"
        Write-Info "  Container Image: $($params.parameters.containerImage.value)"
        Write-Info "  Custom Domain: $($params.parameters.customDomain.value)"
    }
    catch {
        Write-Error "Failed to parse parameters file"
        $validationErrors++
    }
}
else {
    Write-Error "Parameters file not found: $paramsFile"
    $validationErrors++
}

# Check 9: Bicep Template
Write-Info "Checking Bicep template..."
$bicepFile = "$PSScriptRoot\..\main.bicep"
if (Test-Path $bicepFile) {
    Write-Success "Bicep template exists"

    # Try to build the template
    Write-Info "Building Bicep template..."
    $buildOutput = az bicep build --file $bicepFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Bicep template is valid"
    }
    else {
        Write-Error "Bicep template has errors"
        Write-Host $buildOutput
        $validationErrors++
    }
}
else {
    Write-Error "Bicep template not found: $bicepFile"
    $validationErrors++
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Validation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($validationErrors -eq 0) {
    Write-Success "All checks passed! Ready to deploy."
    Write-Host ""
    Write-Info "Next steps:"
    Write-Info "1. Run: .\provision-acc.ps1 -WhatIf  (to preview changes)"
    Write-Info "2. Run: .\provision-acc.ps1           (to deploy)"
    Write-Host ""
    exit 0
}
else {
    Write-Error "Validation failed with $validationErrors error(s)"
    Write-Host ""
    Write-Info "Please fix the errors above before deploying."
    Write-Host ""
    exit 1
}
