import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WooviClient, Logger } from '@woovi/client';
import { registerChargeTools, registerCustomerTools, registerTransactionTools, registerRefundTools } from './tools/index.js';
import { registerBalanceResource, registerDocsResource, registerWebhooksResource } from './resources/index.js';
import { registerDailySummaryPrompt, registerCustomerReportPrompt, registerReconciliationCheckPrompt } from './prompts/index.js';

const logger = new Logger('McpServer', 'info');

const appId = process.env['WOOVI_APP_ID'];
if (!appId) {
  logger.error('WOOVI_APP_ID environment variable is required');
  process.exit(1);
}

const baseUrl = process.env['WOOVI_API_URL'] || 'https://api.openpix.com.br';

export const wooviClient = new WooviClient(appId, baseUrl);

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

registerChargeTools(mcpServer, wooviClient);
registerCustomerTools(mcpServer, wooviClient);
registerTransactionTools(mcpServer, wooviClient);
registerRefundTools(mcpServer, wooviClient);

registerBalanceResource(mcpServer, wooviClient);
registerDocsResource(mcpServer);
registerWebhooksResource(mcpServer);

registerDailySummaryPrompt(mcpServer);
registerCustomerReportPrompt(mcpServer);
registerReconciliationCheckPrompt(mcpServer);

logger.info('MCP Server initialized', {
  tools: 10,
  resources: 3,
  prompts: 3,
  baseUrl,
});
