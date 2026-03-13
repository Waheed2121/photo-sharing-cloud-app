#!/usr/bin/env bash
set -euo pipefail

# Task 2 Azure deployment script (free-tier oriented)
# Usage:
#   export SUBSCRIPTION_ID="<subscription-id>"
#   export PG_ADMIN_USER="<pg-admin-user>"
#   export PG_ADMIN_PASSWORD="<strong-password>"
#   export JWT_SECRET="<strong-jwt-secret>"
#   export GITHUB_REPO_URL="https://github.com/<user>/<repo>"
#   export GITHUB_BRANCH="main"
#   ./scripts/task2_azure_deploy.sh

RG="photo-sharing-rg"
LOCATION="uksouth"
STORAGE_ACCOUNT="photosharest$(date +%s | tail -c 6)"
CONTAINER="photos"
PG_SERVER="photo-pg-$(date +%s | tail -c 6)"
PG_DB="photo_sharing_app"
PLAN="photo-sharing-plan"
WEBAPP="photo-sharing-backend"
STATICAPP="photo-sharing-frontend"

: "${SUBSCRIPTION_ID:?Set SUBSCRIPTION_ID}"
: "${PG_ADMIN_USER:?Set PG_ADMIN_USER}"
: "${PG_ADMIN_PASSWORD:?Set PG_ADMIN_PASSWORD}"
: "${JWT_SECRET:?Set JWT_SECRET}"
: "${GITHUB_REPO_URL:?Set GITHUB_REPO_URL}"
: "${GITHUB_BRANCH:=main}"

az login
az account set --subscription "$SUBSCRIPTION_ID"

az group create --name "$RG" --location "$LOCATION"

az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

az storage container create \
  --name "$CONTAINER" \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login

az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --location "$LOCATION" \
  --admin-user "$PG_ADMIN_USER" \
  --admin-password "$PG_ADMIN_PASSWORD" \
  --tier Burstable \
  --sku-name Standard_B1ms \
  --storage-size 20 \
  --version 16

az postgres flexible-server db create \
  --resource-group "$RG" \
  --server-name "$PG_SERVER" \
  --database-name "$PG_DB"

az postgres flexible-server firewall-rule create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

az appservice plan create \
  --name "$PLAN" \
  --resource-group "$RG" \
  --sku F1

az webapp create \
  --name "$WEBAPP" \
  --resource-group "$RG" \
  --plan "$PLAN" \
  --runtime "NODE|20-lts"

STORAGE_CONN="$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --query connectionString -o tsv)"

DATABASE_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_SERVER}.postgres.database.azure.com:5432/${PG_DB}?sslmode=require"

az webapp config appsettings set \
  --name "$WEBAPP" \
  --resource-group "$RG" \
  --settings \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONN" \
  BLOB_CONTAINER_NAME="$CONTAINER" \
  BACKEND_URL="https://${WEBAPP}.azurewebsites.net" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true

pushd backend >/dev/null
zip -r ../backend.zip . -x "node_modules/*" ".env" "*.swp"
popd >/dev/null

az webapp deployment source config-zip \
  --resource-group "$RG" \
  --name "$WEBAPP" \
  --src backend.zip

az staticwebapp create \
  --name "$STATICAPP" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --source "$GITHUB_REPO_URL" \
  --branch "$GITHUB_BRANCH" \
  --app-location "/frontend" \
  --output-location "." \
  --login-with-github

echo "Deployment complete."
echo "Backend URL: https://${WEBAPP}.azurewebsites.net"
echo "Static app URL: run 'az staticwebapp show -n ${STATICAPP} -g ${RG} --query defaultHostname -o tsv'"
