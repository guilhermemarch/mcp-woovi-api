import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const isoDateStringSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Must be a valid ISO 8601 date string',
});
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().trim().min(1);

const getTransactionsInputSchema = z.object({
  startDate: isoDateStringSchema.optional().describe('Start date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  endDate: isoDateStringSchema.optional().describe('End date filter (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'),
  skip: nonNegativeIntegerSchema.optional().describe('Pagination offset (default: 0)'),
  limit: positiveIntegerSchema.optional().describe('Max records to return (default: 10)'),
  charge: nonEmptyStringSchema.optional().describe('Filter transactions by charge identifier'),
  pixQrCode: nonEmptyStringSchema.optional().describe('Filter transactions by Pix QR code identifier'),
  withdrawal: nonEmptyStringSchema.optional().describe('Filter transactions by withdrawal identifier'),
});
type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

const getBalanceInputSchema = z.object({
  accountId: nonEmptyStringSchema.optional().describe('Optional account ID for multi-account setups. Omit to use the default account.'),
  fresh: z.boolean().optional().describe('Whether to bypass the balance cache. Defaults to true for financial freshness.'),
});
type GetBalanceInput = z.infer<typeof getBalanceInputSchema>;

export function registerTransactionTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'get_transactions',
    {
      description: 'List all Pix transactions for the account with optional ISO 8601 date range filtering and pagination. Supports filtering by startDate, endDate, charge, pixQrCode, and withdrawal identifiers.',
      inputSchema: getTransactionsInputSchema,
    },
    createJsonToolHandler('get_transactions', async (args: GetTransactionsInput) => {
      return await wooviClient.listTransactions({
        ...(args.startDate && { startDate: new Date(args.startDate) }),
        ...(args.endDate && { endDate: new Date(args.endDate) }),
        ...(args.skip !== undefined && { skip: args.skip }),
        ...(args.limit !== undefined && { limit: args.limit }),
        ...(args.charge && { charge: args.charge }),
        ...(args.pixQrCode && { pixQrCode: args.pixQrCode }),
        ...(args.withdrawal && { withdrawal: args.withdrawal }),
      });
    }),
  );

  registerZodTool(
    mcpServer,
    'get_balance',
    {
      description: 'Retrieve current account balance from Woovi API. Returns the account summary including identifiers, display names, and nested balance amounts in centavos. Balance data is cached for 60 seconds, but reads are fresh by default and can opt into cache with fresh: false.',
      inputSchema: getBalanceInputSchema,
    },
    createJsonToolHandler('get_balance', async (args: GetBalanceInput) => {
      return await wooviClient.getBalance(args.accountId, {
        bypassCache: args.fresh !== false,
      });
    }),
  );
}
