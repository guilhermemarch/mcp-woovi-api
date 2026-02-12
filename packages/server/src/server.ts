import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WooviClient } from '@woovi/client';

// Validate environment
const appId = process.env['WOOVI_APP_ID'];
if (!appId) {
  console.error('FATAL: WOOVI_APP_ID environment variable is required');
  process.exit(1);
}

const baseUrl = process.env['WOOVI_API_URL'] || 'https://api.openpix.com.br';

// Initialize Woovi API client
export const wooviClient = new WooviClient(appId, baseUrl);

// Create MCP Server instance
export const mcpServer = new McpServer({
  name: 'woovi-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

console.error('[MCP Server] Initialized with Woovi API client');
