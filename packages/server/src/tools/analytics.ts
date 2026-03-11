import { z } from 'zod';
import type { Charge, Customer, WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const chargeAnalyticsInputSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customer: z.string().optional(),
  skip: z.number().optional(),
  limit: z.number().optional(),
});

const customerSummaryInputSchema = z.object({
  customerId: z.string().describe('Customer correlation ID or tax ID'),
  limit: z.number().optional().describe('Maximum number of recent charges to inspect'),
});

function summarizeCharges(charges: Array<Partial<Charge>>) {
  const byStatus = charges.reduce<Record<string, { count: number; value: number }>>((acc, charge) => {
    const status = charge.status ?? 'UNKNOWN';
    if (!acc[status]) {
      acc[status] = { count: 0, value: 0 };
    }

    acc[status].count += 1;
    acc[status].value += charge.value ?? 0;
    return acc;
  }, {});

  return {
    totalCharges: charges.length,
    totalValue: charges.reduce((sum, charge) => sum + (charge.value ?? 0), 0),
    byStatus,
  };
}

export function registerAnalyticsTools(mcpServer: McpServer, wooviClient: Pick<WooviClient, 'listCharges' | 'getCustomer'>) {
  registerZodTool(
    mcpServer,
    'get_charge_analytics',
    {
      description: 'Aggregate charge data into totals by status and total charge value. Useful for business insights, dashboards, and quick financial summaries.',
      inputSchema: chargeAnalyticsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    createJsonToolHandler('get_charge_analytics', async (args: z.infer<typeof chargeAnalyticsInputSchema>) => {
      const result = await wooviClient.listCharges({
        ...(args.status && { status: args.status }),
        ...(args.customer && { customer: args.customer }),
        ...(args.skip !== undefined && { skip: args.skip }),
        ...(args.limit !== undefined && { limit: args.limit }),
        ...(args.startDate && { startDate: new Date(args.startDate) }),
        ...(args.endDate && { endDate: new Date(args.endDate) }),
      });

      return {
        filters: args,
        summary: summarizeCharges(result.items),
        pageInfo: result.pageInfo,
      };
    }),
  );

  registerZodTool(
    mcpServer,
    'get_customer_payment_summary',
    {
      description: 'Fetch a customer and summarize their recent charges, including total charge count, completed value, and charge status breakdown. Useful as a composable customer analytics tool.',
      inputSchema: customerSummaryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    createJsonToolHandler('get_customer_payment_summary', async (args: z.infer<typeof customerSummaryInputSchema>) => {
      const customer = await wooviClient.getCustomer(args.customerId) as Customer;
      const result = await wooviClient.listCharges({
        customer: customer.correlationID ?? args.customerId,
        limit: args.limit ?? 10,
      });

      const summary = summarizeCharges(result.items);
      return {
        customer,
        summary: {
          ...summary,
          completedValue: result.items
            .filter(charge => charge.status === 'COMPLETED')
            .reduce((sum, charge) => sum + (charge.value ?? 0), 0),
        },
        pageInfo: result.pageInfo,
      };
    }),
  );
}
