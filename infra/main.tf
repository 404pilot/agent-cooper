data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    project = "agent-cooper"
  }
}

# Reference the existing Key Vault (created by bootstrap.sh)
data "azurerm_key_vault" "main" {
  name                = var.key_vault_name
  resource_group_name = "rg-agent-cooper-shared"
}

# Storage account for Azure Functions
resource "azurerm_storage_account" "functions" {
  name                     = "sagentcooperfunc"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Blob container for function code deployment
resource "azurerm_storage_container" "deployments" {
  name                  = "deployments"
  storage_account_id    = azurerm_storage_account.functions.id
  container_access_type = "private"
}

# Log Analytics Workspace (required by Application Insights)
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-agent-cooper"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "ai-agent-cooper"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "Node.JS"
}

# App Service Plan (Flex Consumption)
resource "azurerm_service_plan" "functions" {
  name                = "asp-agent-cooper"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "FC1"
}

# Function App (Flex Consumption)
# Code is deployed separately via az functionapp deployment source config-zip
resource "azurerm_function_app_flex_consumption" "main" {
  name                = "func-agent-cooper"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.functions.id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.functions.primary_blob_endpoint}deployments"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.functions.primary_access_key

  identity {
    type = "SystemAssigned"
  }

  runtime_name    = "node"
  runtime_version = "20"

  site_config {}

  app_settings = {
    "WYZE_EMAIL"                             = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/wyze-email)"
    "WYZE_PASSWORD"                          = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/wyze-password)"
    "WYZE_KEY_ID"                            = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/wyze-key-id)"
    "WYZE_API_KEY"                           = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/wyze-api-key)"
    "GARAGE_CAM_MAC"                         = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/garage-cam-mac)"
    "GARAGE_CAM_MODEL"                       = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/garage-cam-model)"
    "GMAIL_USER"                             = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/gmail-user)"
    "GMAIL_APP_PASSWORD"                     = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/gmail-app-password)"
    "GMAIL_TO_PRIMARY"                       = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/gmail-to-primary)"
    "GMAIL_TO_OTHERS"                        = "@Microsoft.KeyVault(SecretUri=https://${var.key_vault_name}.vault.azure.net/secrets/gmail-to-others)"
    "TZ"                                     = "America/Los_Angeles"
    "APPINSIGHTS_INSTRUMENTATIONKEY"         = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING"  = azurerm_application_insights.main.connection_string
  }

  # Ignore changes made by code deployment (az functionapp deployment source config-zip)
  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
    ]
  }
}

# Grant Function App access to Key Vault secrets
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = data.azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_function_app_flex_consumption.main.identity[0].principal_id

  secret_permissions = ["Get"]
}

# Azure Monitor action group — sends email when alerts fire
resource "azurerm_monitor_action_group" "email" {
  name                = "ag-agent-cooper-email"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "ac-email"

  email_receiver {
    name          = "primary"
    email_address = var.alert_email
  }
}

# Alert: unhandled exceptions in the function app
resource "azurerm_monitor_metric_alert" "function_errors" {
  name                = "alert-function-errors"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Fires when unhandled exceptions occur"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Insights/components"
    metric_name      = "exceptions/count"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.email.id
  }
}
