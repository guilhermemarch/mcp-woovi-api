import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const WEBHOOK_SCHEMAS = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Woovi Webhook Events",
  "description": "JSON Schema for Woovi webhook event payloads",
  "type": "object",
  "properties": {
    "event": {
      "type": "string",
      "enum": [
        "OPENPIX:CHARGE_CREATED",
        "OPENPIX:CHARGE_COMPLETED",
        "OPENPIX:CHARGE_EXPIRED",
        "OPENPIX:TRANSACTION_RECEIVED",
        "OPENPIX:TRANSACTION_REFUND_RECEIVED",
        "OPENPIX:MOVEMENT_CONFIRMED"
      ],
      "description": "The type of webhook event"
    },
    "data": {
      "type": "object",
      "description": "Event-specific data payload",
      "oneOf": [
        {
          "title": "Charge Event Data",
          "properties": {
            "charge": {
              "type": "object",
              "properties": {
                "correlationID": {
                  "type": "string",
                  "description": "Unique identifier for the charge"
                },
                "value": {
                  "type": "number",
                  "description": "Charge amount in centavos"
                },
                "comment": {
                  "type": "string",
                  "description": "Charge description or comment"
                },
                "status": {
                  "type": "string",
                  "enum": ["ACTIVE", "COMPLETED", "EXPIRED"],
                  "description": "Current status of the charge"
                },
                "customer": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "taxID": {
                      "type": "string"
                    }
                  }
                },
                "brCode": {
                  "type": "string",
                  "description": "Pix QR code content"
                },
                "qrCodeImage": {
                  "type": "string",
                  "description": "Base64-encoded QR code image"
                },
                "createdAt": {
                  "type": "string",
                  "format": "date-time"
                },
                "updatedAt": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": ["correlationID", "value", "status"]
            }
          },
          "required": ["charge"]
        },
        {
          "title": "Transaction Event Data",
          "properties": {
            "transaction": {
              "type": "object",
              "properties": {
                "endToEndId": {
                  "type": "string",
                  "description": "Unique transaction identifier"
                },
                "value": {
                  "type": "number",
                  "description": "Transaction amount in centavos"
                },
                "time": {
                  "type": "string",
                  "format": "date-time",
                  "description": "Transaction timestamp"
                },
                "charge": {
                  "type": "object",
                  "properties": {
                    "correlationID": {
                      "type": "string"
                    }
                  }
                },
                "payer": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "taxID": {
                      "type": "string"
                    }
                  }
                }
              },
              "required": ["endToEndId", "value", "time"]
            }
          },
          "required": ["transaction"]
        },
        {
          "title": "Refund Event Data",
          "properties": {
            "refund": {
              "type": "object",
              "properties": {
                "correlationID": {
                  "type": "string",
                  "description": "Unique identifier for the refund"
                },
                "value": {
                  "type": "number",
                  "description": "Refund amount in centavos"
                },
                "comment": {
                  "type": "string",
                  "description": "Refund reason or comment"
                },
                "status": {
                   "type": "string",
                   "enum": ["IN_PROCESSING", "CONFIRMED", "REJECTED"],
                   "description": "Current status of the refund"
                 },
                "charge": {
                  "type": "object",
                  "properties": {
                    "correlationID": {
                      "type": "string"
                    }
                  }
                },
                "createdAt": {
                  "type": "string",
                  "format": "date-time"
                },
                "updatedAt": {
                  "type": "string",
                  "format": "date-time"
                }
              },
              "required": ["correlationID", "value", "status"]
            }
          },
          "required": ["refund"]
        }
      ]
    }
  },
  "required": ["event", "data"],
  "examples": [
    {
      "event": "OPENPIX:CHARGE_COMPLETED",
      "data": {
        "charge": {
          "correlationID": "abc123",
          "value": 5000,
          "comment": "Payment for service",
          "status": "COMPLETED",
          "customer": {
            "name": "John Doe",
            "email": "john@example.com"
          },
          "createdAt": "2024-01-15T10:00:00Z",
          "updatedAt": "2024-01-15T10:05:00Z"
        }
      }
    },
    {
      "event": "OPENPIX:TRANSACTION_RECEIVED",
      "data": {
        "transaction": {
          "endToEndId": "E12345678202401151000",
          "value": 5000,
          "time": "2024-01-15T10:05:00Z",
          "charge": {
            "correlationID": "abc123"
          },
          "payer": {
            "name": "John Doe",
            "taxID": "12345678900"
          }
        }
      }
    }
  ]
};

export function registerWebhooksResource(mcpServer: McpServer) {
  mcpServer.registerResource(
    'webhook_schemas',
    'woovi://webhook-schemas',
    {
      title: 'Woovi Webhook Schemas',
      description: 'JSON Schema definitions for Woovi webhook event payloads (OPENPIX:CHARGE_CREATED, OPENPIX:CHARGE_COMPLETED, OPENPIX:CHARGE_EXPIRED, OPENPIX:TRANSACTION_RECEIVED, OPENPIX:TRANSACTION_REFUND_RECEIVED, OPENPIX:MOVEMENT_CONFIRMED)',
      mimeType: 'application/json',
    },
    async (uri) => {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(WEBHOOK_SCHEMAS, null, 2),
        }],
      };
    }
  );
}
