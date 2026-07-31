{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://skc.example/schemas/app-config.schema.json",
  "title": "SKC Facturas portable configuration",
  "type": "object",
  "required": [
    "format",
    "schemaVersion",
    "settings"
  ],
  "properties": {
    "format": {
      "const": "skc-app-configuration"
    },
    "schemaVersion": {
      "const": 1
    },
    "appVersion": {
      "type": "string"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "settings": {
      "type": "object",
      "properties": {
        "groupName": {
          "type": "string"
        },
        "rules": {
          "type": "object"
        },
        "forms": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "id",
                "visible",
                "required",
                "order"
              ],
              "properties": {
                "id": {
                  "type": "string"
                },
                "label": {
                  "type": "string"
                },
                "visible": {
                  "type": "boolean"
                },
                "required": {
                  "type": "boolean"
                },
                "defaultValue": {
                  "type": "string"
                },
                "order": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          }
        },
        "sync": {
          "type": "object",
          "properties": {
            "provider": {
              "enum": [
                "local",
                "supabase"
              ]
            },
            "supabaseUrl": {
              "type": "string"
            },
            "anonKey": {
              "type": "string"
            },
            "pollSeconds": {
              "type": "number",
              "minimum": 10
            },
            "auto": {
              "type": "boolean"
            },
            "allowSelfSignUp": {
              "type": "boolean"
            },
            "lockUserToEmail": {
              "type": "boolean"
            }
          }
        },
        "integrations": {
          "type": "object",
          "properties": {
            "microsoft": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "tenantId": {
                  "type": "string"
                },
                "clientId": {
                  "type": "string"
                },
                "redirectUri": {
                  "type": "string"
                },
                "scopes": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "driveFolder": {
                  "type": "string"
                },
                "uploadEvidence": {
                  "type": "boolean"
                },
                "sendOutlook": {
                  "type": "boolean"
                },
                "notifyEmail": {
                  "type": "string"
                }
              }
            },
            "telegram": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "mode": {
                  "const": "proxy"
                },
                "proxyUrl": {
                  "type": "string"
                },
                "chatId": {
                  "type": "string"
                },
                "sendTransactions": {
                  "type": "boolean"
                },
                "sendTransfers": {
                  "type": "boolean"
                }
              }
            }
          }
        }
      }
    },
    "catalogs": {
      "type": "object"
    },
    "users": {
      "type": "array"
    },
    "sensitiveIncluded": {
      "type": "boolean"
    }
  }
}
