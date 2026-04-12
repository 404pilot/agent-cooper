terraform {
  required_version = ">= 1.0"

  backend "azurerm" {
    resource_group_name  = "rg-agent-cooper-shared"
    storage_account_name = "saagentcoopertfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
}
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}
