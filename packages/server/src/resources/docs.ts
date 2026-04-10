import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMarkdownResourceContents } from '../utils/resource-handler.js';

const ENDPOINTS_DOCUMENTATION = `# Woovi API Endpoints

Reference for the Woovi/OpenPix API subset implemented in this repository.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/v1/charge | Create Pix charge |
| GET | /api/v1/charge/{id} | Fetch charge |
| GET | /api/v1/charge | List charges |
| POST | /api/v1/customer | Create customer |
| GET | /api/v1/customer/{id} | Fetch customer |
| GET | /api/v1/customer | List customers |
| GET | /api/v1/transaction | List transactions |
| GET | /api/v1/account/ | Fetch default account balance |
| GET | /api/v1/account/{accountId} | Fetch balance for a specific account |
| POST | /api/v1/refund | Create refund from transaction end-to-end ID |
| POST | /api/v1/charge/{id}/refund | Create refund from a charge |
| GET | /api/v1/refund/{id} | Fetch refund |

## Behavioral notes

- All currency values are in centavos.
- \`create_customer\` requires \`name\` and at least one of \`taxID\`, \`email\`, or \`phone\`.
- \`get_balance\` supports optional \`accountId\`.
- \`create_refund\` supports either \`chargeID\` or \`transactionEndToEndId\`.
- The client retries \`429\` responses and transient network failures with backoff.
- Customer reads and tool-driven balance reads are cached for 60 seconds in the reusable client package.
- The \`woovi://balance/current\` and \`woovi://balance/{accountId}\` resources bypass cache to expose real-time balance snapshots.

## Authentication

The client supports:

- \`Authorization: <appId>\` when \`WOOVI_AUTH_MODE=raw\`
- \`Authorization: Bearer <token>\` when \`WOOVI_AUTH_MODE=bearer\`

## MCP-specific additions

- The HTTP transport requires \`MCP_HTTP_AUTH_TOKEN\`.
- \`POST /webhooks/events\` is only exposed when \`WOOVI_WEBHOOK_INGRESS_TOKEN\` is configured.
- Resource templates:
  - \`woovi://balance/{accountId}\`
  - \`woovi://docs/{endpoint}\`
- Bonus tools:
  - \`list_accounts\`
  - \`get_charge_analytics\`
  - \`get_customer_payment_summary\`
`;

const ENDPOINT_SNIPPETS: Record<string, string> = {
  create_charge: 'POST /api/v1/charge?return_existing=true\nFields: correlationID, value, comment, customer, additionalInfo.',
  get_charge: 'GET /api/v1/charge/{id}\nAccepts a charge ID or correlationID and returns { charge }.',
  list_charges: 'GET /api/v1/charge\nSupports status, start, end, customer, subscription, skip, limit.',
  create_customer: 'POST /api/v1/customer\nFields: name, taxID, email, phone, correlationID, address.',
  get_customer: 'GET /api/v1/customer/{id}\nAccepts a customer correlationID or taxID and returns { customer }.',
  list_customers: 'GET /api/v1/customer\nReturns { customers, pageInfo }. This project also applies an optional local search filter over the fetched customer page.',
  get_transactions: 'GET /api/v1/transaction\nSupports start, end, charge, pixQrCode, withdrawal, skip, limit.',
  get_balance: 'GET /api/v1/account/ or GET /api/v1/account/{accountId}\nReturns account balance snapshot; MCP balance resources bypass client cache.',
  create_refund: 'POST /api/v1/refund or POST /api/v1/charge/{id}/refund depending on provided identifiers.',
  get_refund: 'GET /api/v1/refund/{id}\nAccepts refund ID and returns the matching refund payload.',
};

export function registerDocsResource(mcpServer: McpServer) {
  mcpServer.registerResource(
    'endpoints',
    'woovi://docs/endpoints',
    {
      title: 'Woovi API Endpoints',
      description: 'Reference documentation for the Woovi/OpenPix API subset exposed by this MCP server.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      return createMarkdownResourceContents(uri.href, ENDPOINTS_DOCUMENTATION);
    }
  );

  mcpServer.registerResource(
    'endpoint_docs',
    new ResourceTemplate('woovi://docs/{endpoint}', {
      list: undefined,
      complete: {
        endpoint: async () => Object.keys(ENDPOINT_SNIPPETS),
      },
    }),
    {
      title: 'Endpoint Documentation Snippet',
      description: 'Per-endpoint Woovi API documentation snippets for the tools exposed by this MCP server.',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const endpoint = String(variables['endpoint']);
      const snippet = ENDPOINT_SNIPPETS[endpoint];
      return createMarkdownResourceContents(
        uri.href,
        snippet
          ? `# ${endpoint}\n\n${snippet}`
          : `# ${endpoint}\n\nNo documentation snippet is registered for this endpoint.`,
      );
    }
  );
}
