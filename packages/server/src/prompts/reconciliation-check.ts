import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function registerReconciliationCheckPrompt(mcpServer: McpServer) {
  mcpServer.registerPrompt(
    'reconciliation_check',
    {
      title: 'Payment Reconciliation Check',
      description: 'Compare recent transactions against charges to identify discrepancies or unmatched payments',
    },
    async (_args: any): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Fetch recent transactions using the list_transactions tool, then fetch all charges using the list_charges tool. Compare the transactions against charges to identify any discrepancies, unmatched payments, or reconciliation issues. Provide a detailed reconciliation report highlighting any mismatches.`,
            },
          },
        ],
      };
    }
  );
}
