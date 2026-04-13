# Infrastructure

- Terraform manages infrastructure ONLY. Code deployment is handled separately.
- Never use `az` CLI to create, fix, or modify Azure resources directly. Always go through deploy.sh / Terraform.
- The only exceptions to the az rule: bootstrap.sh (one-time setup) and code deployment via `az functionapp deployment source config-zip` (official Azure pattern).
- Use `lifecycle { ignore_changes }` in Terraform to prevent drift from code deployment settings.

# Deployment

- deploy.sh is the single entry point for all deployments.
- Terraform runs first (infra), then az CLI deploys code separately.
- This decoupling is intentional — infrastructure and code have different lifecycles.
- Treat this repo as production. No ad-hoc fixes via portal or az CLI. Every change goes through code → tests → deploy.sh.
- When renaming/removing a function, taint the Function App (`terraform taint azurerm_function_app_flex_consumption.main`) and redeploy to get a clean state. Zip deploy is additive and doesn't remove old function entries.

# Code Style

- Azure Functions are thin handlers. Business logic lives in services.
- All secrets come from Key Vault via env vars. Never hardcode credentials.
- Use winston for logging. Pretty format locally, JSON on Azure.
