import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ENDPOINTS_DOCUMENTATION = `# Woovi API Endpoints

Complete reference of available Woovi API endpoints.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/openpix/v1/charge | Create a new charge (Pix payment request) |
| GET | /api/v1/charge/{id} | Get a specific charge by correlation ID |
| GET | /api/v1/charge/ | List all charges with optional filters |
| POST | /api/v1/customer | Create a new customer |
| GET | /api/v1/customer/{id} | Get a specific customer by correlation ID |
| GET | /api/v1/customer/ | List all customers with optional filters |
| GET | /api/v1/transaction/ | List all transactions with optional filters |
| GET | /api/v1/account/ | Get current account balance information |
| POST | /api/v1/charge/{id}/refund | Create a refund for a specific charge |
| GET | /api/v1/refund/{id} | Get a specific refund by correlation ID |

## Charge Endpoints

### Create Charge
- **POST** \`/api/openpix/v1/charge\`
- Creates a new Pix payment request
- Amount values are in centavos (5000 = R$ 50.00)
- Returns charge details including QR code and Pix copy-paste code

### Get Charge
- **GET** \`/api/v1/charge/{id}\`
- Retrieves details of a specific charge
- Use the charge's correlation ID as the identifier

### List Charges
- **GET** \`/api/v1/charge/\`
- Lists all charges with optional filtering
- Supports filters: status, startDate, endDate, pagination

## Customer Endpoints

### Create Customer
- **POST** \`/api/v1/customer\`
- Creates a new customer record
- Required fields: name
- Optional fields: email, phone, taxID

### Get Customer
- **GET** \`/api/v1/customer/{id}\`
- Retrieves details of a specific customer
- Use the customer's correlation ID as the identifier

### List Customers
- **GET** \`/api/v1/customer/\`
- Lists all customers with optional filtering
- Supports pagination with skip and limit parameters

## Transaction Endpoints

### List Transactions
- **GET** \`/api/v1/transaction/\`
- Lists all transactions
- Supports filtering by charge, startDate, endDate
- Includes pagination support

## Account Endpoints

### Get Balance
- **GET** \`/api/v1/account/\`
- Retrieves current account balance information
- Returns available balance and total amount
- Balance data is cached for 60 seconds

## Refund Endpoints

### Create Refund
- **POST** \`/api/v1/charge/{id}/refund\`
- Creates a refund for a completed charge
- Specify refund amount and optional correlation ID

### Get Refund
- **GET** \`/api/v1/refund/{id}\`
- Retrieves details of a specific refund
- Use the refund's correlation ID as the identifier

## Authentication

All endpoints require authentication using the Woovi API key in the Authorization header:

\`\`\`
Authorization: appID
\`\`\`

## Response Format

All endpoints return JSON responses with consistent structure:
- Success responses include data in the response body
- Error responses include error messages and appropriate HTTP status codes

## Rate Limiting

The API implements rate limiting to ensure service stability. Monitor response headers for rate limit information.
`;

export function registerDocsResource(mcpServer: McpServer) {
  mcpServer.registerResource(
    'endpoints',
    'woovi://docs/endpoints',
    {
      title: 'Woovi API Endpoints',
      description: 'Complete documentation of all available Woovi API endpoints',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: ENDPOINTS_DOCUMENTATION,
        }],
      };
    }
  );
}
