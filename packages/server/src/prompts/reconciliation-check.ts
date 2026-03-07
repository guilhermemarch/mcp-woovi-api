import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { registerZodPrompt } from '../utils/mcp-registration.js';

const reconciliationCheckArgsSchema = {
  startDate: z.string().optional().describe('ISO 8601 start date for reconciliation period'),
  endDate: z.string().optional().describe('ISO 8601 end date for reconciliation period'),
  accountId: z.string().optional().describe('Optional account ID for multi-account balance context'),
};

type ReconciliationCheckPromptArgs = {
  startDate?: string | undefined;
  endDate?: string | undefined;
  accountId?: string | undefined;
};

export function registerReconciliationCheckPrompt(mcpServer: McpServer) {
  registerZodPrompt(
    mcpServer,
    'reconciliation_check',
    {
      title: 'Payment Reconciliation Check',
      description: 'Compare recent transactions against charges to identify discrepancies or unmatched payments',
      argsSchema: reconciliationCheckArgsSchema,
    },
    async (args: ReconciliationCheckPromptArgs = {}): Promise<GetPromptResult> => {
      const startDate = args?.startDate || 'the start of the current day';
      const endDate = args?.endDate || 'now';
      const balanceInstruction = args?.accountId
        ? `Also call get_balance with {"accountId":"${args.accountId}"} before summarizing final cash position.`
        : 'Also call get_balance before summarizing final cash position.';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Run a reconciliation check for the period between ${startDate} and ${endDate}. Call get_transactions for that range, then call list_charges for the same range. Compare expected vs received payments, identify charges without matching payments, payments without an obvious charge context, refunds that affect net collections, and status mismatches. ${balanceInstruction} Produce a concise reconciliation report with findings, likely causes, and next actions.`,
            },
          },
        ],
      };
    },
  );
}
