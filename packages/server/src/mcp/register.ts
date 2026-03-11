import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WooviClient } from '@woovi/client';
import {
  registerChargeTools,
  registerCustomerTools,
  registerTransactionTools,
  registerRefundTools,
  registerAccountTools,
  registerAnalyticsTools,
} from '../domains/index.js';
import {
  registerBalanceResource,
  registerDocsResource,
  registerWebhooksResource,
} from '../resources/index.js';
import {
  registerDailySummaryPrompt,
  registerCustomerReportPrompt,
  registerReconciliationCheckPrompt,
} from '../prompts/index.js';

export function registerMcpCapabilities(mcpServer: McpServer, wooviClient: WooviClient) {
  registerChargeTools(mcpServer, wooviClient);
  registerCustomerTools(mcpServer, wooviClient);
  registerTransactionTools(mcpServer, wooviClient);
  registerRefundTools(mcpServer, wooviClient);
  registerAccountTools(mcpServer, wooviClient);
  registerAnalyticsTools(mcpServer, wooviClient);

  registerBalanceResource(mcpServer, wooviClient);
  registerDocsResource(mcpServer);
  registerWebhooksResource(mcpServer);

  registerDailySummaryPrompt(mcpServer);
  registerCustomerReportPrompt(mcpServer);
  registerReconciliationCheckPrompt(mcpServer);
}
