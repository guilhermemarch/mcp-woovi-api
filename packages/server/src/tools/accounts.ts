import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { formatToolError, formatToolSuccess } from '../utils/tool-handler.js';

const listAccountsOutputSchema = z.object({
  accounts: z.array(z.object({
    accountId: z.string(),
    isDefault: z.boolean().optional(),
    officialName: z.string().optional(),
    tradeName: z.string().optional(),
    branch: z.string().optional(),
    account: z.string().optional(),
    accountName: z.string().optional(),
    taxID: z.string().optional(),
    taxId: z.string().optional(),
    balance: z.object({
      total: z.number(),
      blocked: z.number(),
      available: z.number(),
      blockedBySecurity: z.number().optional(),
      blockedByWithdrawSafety: z.number().optional(),
    }),
  })),
});

export function registerAccountTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'list_accounts',
    {
      description: 'List Woovi accounts available to the configured application, including account IDs, default account flag, and current balance snapshot. Useful for multi-account workflows before calling get_balance with a specific accountId.',
      inputSchema: z.object({}),
      outputSchema: listAccountsOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const accounts = await wooviClient.listAccounts();
        return formatToolSuccess({ accounts }, {
          structuredContent: { accounts },
        });
      } catch (error: unknown) {
        return formatToolError(error, 'list_accounts');
      }
    },
  );
}
