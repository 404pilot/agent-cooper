output "function_app_name" {
  value = azurerm_function_app_flex_consumption.main.name
}

output "function_app_url" {
  value = "https://${azurerm_function_app_flex_consumption.main.default_hostname}"
}

output "application_insights_name" {
  value = azurerm_application_insights.main.name
}
