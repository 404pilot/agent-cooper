variable "resource_group_name" {
  type    = string
  default = "rg-agent-cooper"
}

variable "location" {
  type    = string
  default = "westus2"
}

variable "key_vault_name" {
  type    = string
  default = "kv-agent-cooper"
}

variable "alert_email" {
  type = string
}