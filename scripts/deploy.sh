#!/usr/bin/env bash --norc --noprofile
#
# Build and deploy everything.
# Phase 1: Terraform provisions/updates infrastructure.
# Phase 2: Code is zip-deployed to the Function App.
#
# Infrastructure and code are decoupled — Terraform ignores deployment settings,
# code deployment doesn't affect infrastructure state.
#
# Usage:
#   ./scripts/deploy.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SECRETS_FILE="$ROOT_DIR/secrets/secrets.yaml"
DEPLOY_DIR="$ROOT_DIR/.deploy"

FUNCTION_APP="func-agent-cooper"
RESOURCE_GROUP="rg-agent-cooper"

log() { echo "[deploy] $1"; }

check_azure_login() {
  log "Checking Azure login..."
  az account show > /dev/null 2>&1 || { log "ERROR: Not logged in. Run: az login"; exit 1; }
}

build() {
  log "Installing dependencies..."
  cd "$ROOT_DIR"
  npm ci

  log "Compiling TypeScript..."
  npm run build
}

create_zip() {
  log "Creating deployment zip..."
  rm -rf "$DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR/staging"

  # Production dependencies only
  cp "$ROOT_DIR/package.json" "$ROOT_DIR/package-lock.json" "$DEPLOY_DIR/staging/"
  cd "$DEPLOY_DIR/staging"
  npm ci --omit=dev --ignore-scripts
  cd "$ROOT_DIR"

  # Copy built code and host.json
  cp "$ROOT_DIR/host.json" "$DEPLOY_DIR/staging/"
  cp -r "$ROOT_DIR/dist" "$DEPLOY_DIR/staging/"

  # Create zip
  cd "$DEPLOY_DIR/staging"
  zip -qr "$DEPLOY_DIR/function.zip" .
  cd "$ROOT_DIR"

  log "Zip created: $(du -h "$DEPLOY_DIR/function.zip" | cut -f1)"
}

deploy_infra() {
  log "Decrypting alert email..."
  local alert_email
  alert_email=$(sops -d --extract '["mail"]["to"]["primary"]' "$SECRETS_FILE")

  log "Running Terraform (infrastructure only)..."
  cd "$ROOT_DIR/infra"
  terraform init -upgrade
  terraform apply -auto-approve \
    -var "alert_email=$alert_email"
}

deploy_code() {
  log "Deploying function code..."
  az functionapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FUNCTION_APP" \
    --src "$DEPLOY_DIR/function.zip" \
    --output none

  log "Code deployed to $FUNCTION_APP"
}

main() {
  check_azure_login
  build
  create_zip
  deploy_infra
  deploy_code
  log "Deploy complete!"
}

main
