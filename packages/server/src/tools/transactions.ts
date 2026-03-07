import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const getTransactionsInputSchema = z.object({
  startDate: z.string().optional().describe('Start date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  endDate: z.string().optional().describe('End date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  skip: z.number().optional().describe('Pagination offset (default: 0)'),
  limit: z.number().optional().describe('Max records to return (default: 10)'),
});
type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

const getBalanceInputSchema = z.object({
  accountId: z.string().optional().describe('Optional account ID for multi-account setups. Omit to use the default account.'),
});
type GetBalanceInput = z.infer<typeof getBalanceInputSchema>;

export function registerTransactionTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'get_transactions',
    {
      description: 'List all Pix transactions for the account with optional date range filtering and pagination. Supports filtering by startDate and endDate in ISO 8601 format. Pagination uses offset-based skip/limit pattern. Returns paginated transaction list with details including amount (in centavos), status, customer info, and timestamps. Useful for reconciliation, reporting, and transaction history analysis.',
      inputSchema: getTransactionsInputSchema,
    },
    createJsonToolHandler('get_transactions', async (args: GetTransactionsInput) => {
      return await wooviClient.listTransactions({
        ...(args.startDate && { startDate: new Date(args.startDate) }),
        ...(args.endDate && { endDate: new Date(args.endDate) }),
        ...(args.skip !== undefined && { skip: args.skip }),
        ...(args.limit !== undefined && { limit: args.limit }),
      });
    }),
  );

  registerZodTool(
    mcpServer,
    'get_balance',
    {
      description: 'Retrieve current account balance from Woovi API. Returns balance information including available balance (in centavos) and account details. Response is cached for 60 seconds to optimize performance and reduce API calls. Balance amounts are always in centavos (5000 = R$ 50.00). Use for dashboard displays, balance checks before operations, and account monitoring.',
      inputSchema: getBalanceInputSchema,
    },
    createJsonToolHandler('get_balance', async (args: GetBalanceInput) => {
      return args.accountId
        ? await wooviClient.getBalance(args.accountId)
        : await wooviClient.getBalance();
    }),
  );
}
