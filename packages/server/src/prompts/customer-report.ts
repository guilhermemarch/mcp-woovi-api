import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export function registerCustomerReportPrompt(mcpServer: McpServer) {
  mcpServer.registerPrompt(
    'customer_report',
    {
      title: 'Customer Activity Report',
      description: 'Generate a detailed activity report for a specific customer including their details and recent charges',
      argsSchema: {
        customer_id: z.string().describe('Customer ID to generate report for'),
      } as any,
    },
    async (args: any): Promise<GetPromptResult> => {
      const customerId = args.customer_id;
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Fetch customer details for customer ID "${customerId}" using the get_customer tool, then list the last 5 charges for this customer using the list_charges tool with appropriate filtering. Provide a complete customer activity report including customer information and recent payment activity.`,
            },
          },
        ],
      };
    }
  );
}
