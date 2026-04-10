import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { registerZodPrompt } from '../utils/mcp-registration.js';

const dailySummaryArgsSchema = {
  date: z.string().optional().describe('ISO 8601 date for the summary (defaults to today)'),
  accountId: z.string().optional().describe('Optional account ID for multi-account setups'),
  limit: z.coerce.number().int().positive().optional().describe('Optional cap for how many recent transactions and charges to inspect'),
};

type DailySummaryPromptArgs = {
  date?: string | undefined;
  accountId?: string | undefined;
  limit?: number | undefined;
};

export function registerDailySummaryPrompt(mcpServer: McpServer) {
  registerZodPrompt(
    mcpServer,
    'daily_summary',
    {
      title: 'Daily Account Summary',
      description: 'Generate a daily summary of balance, transactions, and charges for a specific date or for today by default.',
      argsSchema: dailySummaryArgsSchema,
    },
    async (args: DailySummaryPromptArgs = {}): Promise<GetPromptResult> => {
      const date = args?.date || 'today';
      const limit = args?.limit ?? 20;
      const balanceArgs = args?.accountId ? ` with {"accountId":"${args.accountId}"}` : '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Prepare a financial daily summary for ${date}. First call get_balance${balanceArgs}. Then call get_transactions with the matching date range and limit=${limit}. Also call list_charges for the same period and limit=${limit}. Summarize total incoming activity, completed vs active charges, unusual refunds or failures, and highlight reconciliation risks. Keep all currency values in centavos and convert them to BRL in the narrative when useful.`,
            },
          },
        ],
      };
    },
  );
}
