#!/usr/bin/env bash --norc --noprofile
#
# One-time setup: create shared resource group, Key Vault, SOPS encryption key,
# and Terraform state storage.
#
# Usage:
#   ./scripts/bootstrap.sh
#
set -euo pipefail

RESOURCE_GROUP="rg-agent-cooper-shared"
LOCATION="westus2"
VAULT_NAME="kv-agent-cooper"
SOPS_KEY_NAME="sops-key"
# Azure storage names: lowercase alphanumeric only, 3-24 chars, globally unique
TFSTATE_STORAGE="saagentcoopertfstate"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[bootstrap] $1"; }

check_azure_login() {
  log "Checking Azure login..."
  az account show > /dev/null 2>&1 || { log "ERROR: Not logged in. Run: az login"; exit 1; }
  log "Logged in as $(az account show --query user.name -o tsv)"
}

create_resource_group() {
  log "Creating resource group: $RESOURCE_GROUP"
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
}

create_key_vault() {
  log "Creating Key Vault: $VAULT_NAME"
  az keyvault create \
    --name "$VAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-rbac-authorization false \
    --output none
}

create_sops_key() {
  log "Creating RSA key for SOPS: $SOPS_KEY_NAME"
  az keyvault key create \
    --vault-name "$VAULT_NAME" \
    --name "$SOPS_KEY_NAME" \
    --kty RSA \
    --size 2048 \
    --output none
}

create_tfstate_storage() {
  log "Creating storage account for Terraform state: $TFSTATE_STORAGE"
  az storage account create \
    --name "$TFSTATE_STORAGE" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --output none

  log "Creating blob container: tfstate"
  az storage container create \
    --name "tfstate" \
    --account-name "$TFSTATE_STORAGE" \
    --output none
}

write_sops_config() {
  local sops_key_id
  sops_key_id=$(az keyvault key show \
    --vault-name "$VAULT_NAME" \
    --name "$SOPS_KEY_NAME" \
    --query key.kid -o tsv)

  log "Writing .sops.yaml (key: $sops_key_id)"
  cat > "$ROOT_DIR/.sops.yaml" << EOF
creation_rules:
  - path_regex: secrets/.*\.yaml$
    azure_keyvault: ${sops_key_id}
EOF
}

main() {
  check_azure_login
  create_resource_group
  create_key_vault
  create_sops_key
  create_tfstate_storage
  write_sops_config

  log ""
  log "Done! Shared resources created."
  log ""
  log "Next steps:"
  log "  sops secrets/secrets.yaml              # add secrets, save"
  log "  ./scripts/upload-secrets.sh            # upload to Key Vault"
  log "  ./scripts/deploy.sh                    # deploy infrastructure + functions"
}

main
