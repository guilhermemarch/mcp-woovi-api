import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createJsonResourceHandler } from '../utils/resource-handler.js';

export function registerBalanceResource(mcpServer: McpServer, wooviClient: WooviClient) {
  const currentBalanceHandler = createJsonResourceHandler(async () => {
    return await wooviClient.getBalance(undefined, { bypassCache: true });
  });

  mcpServer.registerResource(
    'balance',
    'woovi://balance/current',
    {
      title: 'Account Balance',
      description: 'Current Woovi account balance information fetched in real-time from the Woovi API.',
      mimeType: 'application/json',
    },
    currentBalanceHandler
  );

  mcpServer.registerResource(
    'account_balance',
    new ResourceTemplate('woovi://balance/{accountId}', {
      list: undefined,
      complete: {
        accountId: async () => [],
      },
    }),
    {
      title: 'Account Balance By Account ID',
      description: 'Fetch balance for a specific Woovi account using the accountId in the resource URI.',
      mimeType: 'application/json',
    },
    createJsonResourceHandler(async (_uri, variables) => {
      return await wooviClient.getBalance(String(variables['accountId']), { bypassCache: true });
    })
  );
}
