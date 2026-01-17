#!/bin/bash

ENV="-acc"
APP=play14-redis$ENV
RG=play14-community
CONTAINER_ENV=play14-container-env
REDIS_PASSWORD=$(openssl rand -base64 32)

echo "Delete existing Redis container $APP (if any)"
az containerapp delete \
  --name $APP \
  --resource-group $RG \
  --yes 2>/dev/null || true

echo "Create Redis container $APP with secret"
az containerapp create \
  --name $APP \
  --resource-group $RG \
  --environment $CONTAINER_ENV \
  --image redis:8-alpine \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 1 \
  --max-replicas 1 \
  --ingress internal \
  --target-port 6379 \
  --secrets "redis-password=$REDIS_PASSWORD" \
  --env-vars "REDIS_PASSWORD=secretref:redis-password"

echo "Update Redis container $APP to use password from env var"
YAML_FILE=$(mktemp)
cat > "$YAML_FILE" <<'YAML'
properties:
  template:
    containers:
      - name: play14-redis
        image: redis:8-alpine
        command:
          - sh
          - -c
          - redis-server --requirepass "$REDIS_PASSWORD"
        resources:
          cpu: 0.25
          memory: 0.5Gi
        env:
          - name: REDIS_PASSWORD
            secretRef: redis-password
YAML
az containerapp update \
  --name $APP \
  --resource-group $RG \
  --yaml "$YAML_FILE"
rm "$YAML_FILE"

echo "Set the Redis URL as a secret in the API container app play14-api$ENV"
az containerapp secret set \
  --name play14-api$ENV \
  --resource-group $RG \
  --secrets "redis-url=redis://:$REDIS_PASSWORD@$APP:6379"

echo "Update the API play14-api$ENV to use the secret"
az containerapp update \
  --name play14-api$ENV \
  --resource-group $RG \
  --set-env-vars "REDIS_URL=secretref:redis-url"
