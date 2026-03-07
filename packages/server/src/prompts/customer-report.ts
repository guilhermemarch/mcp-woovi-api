import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { registerZodPrompt } from '../utils/mcp-registration.js';

const customerReportArgsSchema = {
  customer_id: z.string().describe('Customer ID to generate report for'),
  limit: z.number().optional().describe('Maximum number of recent charges to inspect'),
};

type CustomerReportPromptArgs = {
  customer_id?: string | undefined;
  limit?: number | undefined;
};

export function registerCustomerReportPrompt(mcpServer: McpServer) {
  registerZodPrompt(
    mcpServer,
    'customer_report',
    {
      title: 'Customer Activity Report',
      description: 'Generate a detailed payment-history report for a specific customer using customer, charge, and analytics tools.',
      argsSchema: customerReportArgsSchema,
    },
    async (args: CustomerReportPromptArgs = {}): Promise<GetPromptResult> => {
      const customerId = args.customer_id ?? '';
      const limit = args.limit || 10;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Build a payment history report for customer "${customerId}". First call get_customer with {"customerId":"${customerId}"}. Then call get_customer_payment_summary with {"customerId":"${customerId}","limit":${limit}} for an aggregate overview. If you need more detail, call list_charges with the resolved customer correlationID and limit=${limit}. Explain charge status distribution, completed volume, recent activity, and possible follow-up actions.`,
            },
          },
        ],
      };
    },
  );
}
