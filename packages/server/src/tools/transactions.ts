import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const getTransactionsInputSchema = z.object({
  startDate: z.string().optional().describe('Start date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  endDate: z.string().optional().describe('End date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  skip: z.number().optional().describe('Pagination offset (default: 0)'),
  limit: z.number().optional().describe('Max records to return (default: 10)'),
});
type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

const getBalanceInputSchema = z.object({});

export function registerTransactionTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'get_transactions',
    {
      description: 'List all Pix transactions for the account with optional date range filtering and pagination. Supports filtering by startDate and endDate in ISO 8601 format. Pagination uses offset-based skip/limit pattern. Returns paginated transaction list with details including amount (in centavos), status, customer info, and timestamps. Useful for reconciliation, reporting, and transaction history analysis.',
      inputSchema: getTransactionsInputSchema as any,
    },
    async (args: GetTransactionsInput) => {
      try {
        const filters: {
          startDate?: Date;
          endDate?: Date;
          skip?: number;
          limit?: number;
        } = {};

        if (args.startDate) {
          filters.startDate = new Date(args.startDate);
        }

        if (args.endDate) {
          filters.endDate = new Date(args.endDate);
        }

        if (args.skip !== undefined) {
          filters.skip = args.skip;
        }

        if (args.limit !== undefined) {
          filters.limit = args.limit;
        }

        const result = await wooviClient.listTransactions(filters);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  mcpServer.registerTool(
    'get_balance',
    {
      description: 'Retrieve current account balance from Woovi API. Returns balance information including available balance (in centavos) and account details. Response is cached for 60 seconds to optimize performance and reduce API calls. Balance amounts are always in centavos (5000 = R$ 50.00). Use for dashboard displays, balance checks before operations, and account monitoring.',
      inputSchema: getBalanceInputSchema as any,
    },
    async (_args: Record<string, never>) => {
      try {
        const result = await wooviClient.getBalance();
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
