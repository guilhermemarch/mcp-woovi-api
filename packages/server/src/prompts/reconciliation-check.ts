import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export function registerReconciliationCheckPrompt(mcpServer: McpServer) {
  mcpServer.registerPrompt(
    'reconciliation_check',
    {
      title: 'Payment Reconciliation Check',
      description: 'Compare recent transactions against charges to identify discrepancies or unmatched payments',
      argsSchema: {
        startDate: z.string().optional().describe('ISO 8601 start date for reconciliation period'),
        endDate: z.string().optional().describe('ISO 8601 end date for reconciliation period'),
      } as any,
    },
    async (_args: any): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Fetch recent transactions using the get_transactions tool, then fetch all charges using the list_charges tool. Compare the transactions against charges to identify any discrepancies, unmatched payments, or reconciliation issues. Provide a detailed reconciliation report highlighting any mismatches.`,
            },
          },
        ],
      };
    }
  );
}
