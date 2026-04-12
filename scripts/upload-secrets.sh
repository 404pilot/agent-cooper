#!/usr/bin/env bash --norc --noprofile
#
# Decrypt SOPS secrets and upload them to Azure Key Vault.
#
# Usage:
#   ./scripts/upload-secrets.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SECRETS_FILE="$ROOT_DIR/secrets/secrets.yaml"
VAULT_NAME="kv-agent-cooper"

log() { echo "[upload-secrets] $1"; }

check_azure_login() {
  log "Checking Azure login..."
  az account show > /dev/null 2>&1 || { log "ERROR: Not logged in. Run: az login"; exit 1; }
}

decrypt_secrets() {
  log "Decrypting secrets..."
  WYZE_EMAIL=$(sops -d --extract '["wyze"]["email"]' "$SECRETS_FILE")
  WYZE_PASSWORD=$(sops -d --extract '["wyze"]["password"]' "$SECRETS_FILE")
  WYZE_KEY_ID=$(sops -d --extract '["wyze"]["key_id"]' "$SECRETS_FILE")
  WYZE_API_KEY=$(sops -d --extract '["wyze"]["api_key"]' "$SECRETS_FILE")
  GARAGE_CAM_MAC=$(sops -d --extract '["wyze"]["devices"]["garage_cam"]["mac"]' "$SECRETS_FILE")
  GARAGE_CAM_MODEL=$(sops -d --extract '["wyze"]["devices"]["garage_cam"]["model"]' "$SECRETS_FILE")
  GMAIL_USER=$(sops -d --extract '["mail"]["service"]["gmail"]["user"]' "$SECRETS_FILE")
  GMAIL_APP_PASSWORD=$(sops -d --extract '["mail"]["service"]["gmail"]["app_password"]' "$SECRETS_FILE")
  GMAIL_TO_PRIMARY=$(sops -d --extract '["mail"]["to"]["primary"]' "$SECRETS_FILE")
  GMAIL_TO_OTHERS=$(sops -d "$SECRETS_FILE" | node -e "const y=require('yaml');const d=y.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log((d.mail.to.others||[]).join(','))")
}

upload_secrets() {
  log "Uploading secrets to Key Vault: $VAULT_NAME"
  az keyvault secret set --vault-name "$VAULT_NAME" --name "wyze-email"         --value "$WYZE_EMAIL"         --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "wyze-password"      --value "$WYZE_PASSWORD"      --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "wyze-key-id"        --value "$WYZE_KEY_ID"        --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "wyze-api-key"       --value "$WYZE_API_KEY"       --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "garage-cam-mac"     --value "$GARAGE_CAM_MAC"     --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "garage-cam-model"   --value "$GARAGE_CAM_MODEL"   --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "gmail-user"         --value "$GMAIL_USER"         --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "gmail-app-password" --value "$GMAIL_APP_PASSWORD" --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "gmail-to-primary"   --value "$GMAIL_TO_PRIMARY"   --output none
  az keyvault secret set --vault-name "$VAULT_NAME" --name "gmail-to-others"    --value "$GMAIL_TO_OTHERS"    --output none
}

main() {
  check_azure_login
  decrypt_secrets
  upload_secrets
  log "Done!"
}

main
