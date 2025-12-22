@description('Environment type (dev, acc, prod)')
param environmentType string

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Container app name')
param appName string

@description('Container image to deploy')
param containerImage string

@description('Database configuration')
param databaseConfig object

@description('Storage configuration')
param storageConfig object

@description('Registry configuration')
param registryConfig object

@description('Application secrets')
@secure()
param appSecrets object

@description('Custom domain name')
param customDomain string = ''

@description('Certificate name for custom domain')
param certificateName string = ''

@description('Container environment name')
param containerEnvironmentName string = 'play14-container-env'

// Reference existing container environment
resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerEnvironmentName
}

// Reference existing certificate if custom domain is provided (bring your own certificate)
resource certificate 'Microsoft.App/managedEnvironments/certificates@2024-03-01' existing = if (!empty(customDomain)) {
  name: certificateName
  parent: containerEnvironment
}

// Container App with service principal authentication
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: {
    environment: environmentType
    app: 'play14-api'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 1337
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        customDomains: !empty(customDomain) ? [
          {
            name: customDomain
            certificateId: certificate.id
            bindingType: 'SniEnabled'
          }
        ] : []
      }
      registries: startsWith(containerImage, registryConfig.loginServer) ? [
        {
          server: registryConfig.loginServer
          identity: 'system'
        }
      ] : []
      secrets: [
        {
          name: 'database-password'
          value: appSecrets.databasePassword
        }
        {
          name: 'app-keys'
          value: appSecrets.appKeys
        }
        {
          name: 'api-token-salt'
          value: appSecrets.apiTokenSalt
        }
        {
          name: 'admin-jwt-secret'
          value: appSecrets.adminJwtSecret
        }
        {
          name: 'jwt-secret'
          value: appSecrets.jwtSecret
        }
        {
          name: 'storage-account-key'
          value: appSecrets.storageAccountKey
        }
        {
          name: 'mapbox-access-token'
          value: appSecrets.mapboxAccessToken
        }
        {
          name: 'transfer-token-salt'
          value: appSecrets.transferTokenSalt
        }
        {
          name: 'github-token'
          value: appSecrets.githubToken
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'play14-api'
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'HOST'
              value: '0.0.0.0'
            }
            {
              name: 'PORT'
              value: '1337'
            }
            {
              name: 'DATABASE_CLIENT'
              value: 'postgres'
            }
            {
              name: 'DATABASE_HOST'
              value: databaseConfig.host
            }
            {
              name: 'DATABASE_PORT'
              value: '5432'
            }
            {
              name: 'DATABASE_NAME'
              value: databaseConfig.name
            }
            {
              name: 'DATABASE_USERNAME'
              value: databaseConfig.username
            }
            {
              name: 'DATABASE_PASSWORD'
              secretRef: 'database-password'
            }
            {
              name: 'DATABASE_SSL'
              value: 'true'
            }
            {
              name: 'DATABASE_SSL_SELF'
              value: 'false'
            }
            {
              name: 'APP_KEYS'
              secretRef: 'app-keys'
            }
            {
              name: 'API_TOKEN_SALT'
              secretRef: 'api-token-salt'
            }
            {
              name: 'ADMIN_JWT_SECRET'
              secretRef: 'admin-jwt-secret'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'TRANSFER_TOKEN_SALT'
              secretRef: 'transfer-token-salt'
            }
            {
              name: 'STORAGE_ACCOUNT'
              value: storageConfig.accountName
            }
            {
              name: 'STORAGE_ACCOUNT_KEY'
              secretRef: 'storage-account-key'
            }
            {
              name: 'STORAGE_CONTAINER_NAME'
              value: storageConfig.containerName
            }
            {
              name: 'STORAGE_URL'
              value: 'https://${storageConfig.accountName}.blob.${environment().suffixes.storage}'
            }
            {
              name: 'STORAGE_CDN_URL'
              value: storageConfig.cdnUrl
            }
            {
              name: 'STRAPI_ADMIN_MAPBOX_ACCESS_TOKEN'
              secretRef: 'mapbox-access-token'
            }
            {
              name: 'GITHUB_TOKEN'
              secretRef: 'github-token'
            }
            {
              name: 'GITHUB_OWNER'
              value: 'play14team'
            }
            {
              name: 'GITHUB_REPO'
              value: 'play14-ui'
            }
            {
              name: 'GITHUB_WORKFLOW_ID'
              value: '52506304'
            }
            {
              name: 'GITHUB_BRANCH'
              value: 'main'
            }
            {
              name: 'CRON_ENABLED'
              value: 'false'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

// Assign AcrPull role to container app's managed identity (only for private registry images)
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (startsWith(containerImage, registryConfig.loginServer)) {
  name: guid(containerApp.id, 'AcrPull')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull role
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppName string = containerApp.name
output containerAppFQDN string = containerApp.properties.configuration.ingress.fqdn
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output customDomainUrl string = !empty(customDomain) ? 'https://${customDomain}' : ''
