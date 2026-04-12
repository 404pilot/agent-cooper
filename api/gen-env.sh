#!/usr/bin/env bash --norc --noprofile
#
# Decrypt SOPS secrets and generate a .env file for the VS Code REST Client.
#
# Usage:
#   ./api/gen-env.sh secrets/secrets.yaml .env
#
set -euo pipefail

SECRETS_FILE="${1:?Usage: ./api/gen-env.sh <secrets-file> <output-env-file>}"
ENV_FILE="${2:?Usage: ./api/gen-env.sh <secrets-file> <output-env-file>}"

echo "==> Decrypting secrets..."
WYZE_EMAIL=$(sops -d --extract '["wyze"]["email"]' "$SECRETS_FILE")
WYZE_PASSWORD=$(sops -d --extract '["wyze"]["password"]' "$SECRETS_FILE")
WYZE_KEY_ID=$(sops -d --extract '["wyze"]["key_id"]' "$SECRETS_FILE")
WYZE_API_KEY=$(sops -d --extract '["wyze"]["api_key"]' "$SECRETS_FILE")

# Triple MD5 hash the password for Wyze API
MD5_PASS=$(echo -n "$WYZE_PASSWORD" | md5)
MD5_PASS=$(echo -n "$MD5_PASS" | md5)
MD5_PASS=$(echo -n "$MD5_PASS" | md5)

GARAGE_CAM_MAC=$(sops -d --extract '["wyze"]["devices"]["garage_cam"]["mac"]' "$SECRETS_FILE")
GARAGE_CAM_MODEL=$(sops -d --extract '["wyze"]["devices"]["garage_cam"]["model"]' "$SECRETS_FILE")

cat > "$ENV_FILE" << EOF
WYZE_EMAIL=${WYZE_EMAIL}
WYZE_PASSWORD_MD5=${MD5_PASS}
WYZE_KEY_ID=${WYZE_KEY_ID}
WYZE_API_KEY=${WYZE_API_KEY}
GARAGE_CAM_MAC=${GARAGE_CAM_MAC}
GARAGE_CAM_MODEL=${GARAGE_CAM_MODEL}
EOF

echo "==> Written to $ENV_FILE"
