import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBalanceResource(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerResource(
    'balance',
    'woovi://balance/current',
    {
      title: 'Account Balance',
      description: 'Current Woovi account balance information. Note: Balance data is cached for 60 seconds by the WooviClient.',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const balance = await wooviClient.getBalance();
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(balance, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: error.message }, null, 2),
          }],
        };
      }
    }
  );
}
