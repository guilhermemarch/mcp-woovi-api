import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const createRefundInputSchema = z.object({
  chargeID: z.string().describe('Charge ID or correlationID to refund'),
  amount: z.number().optional().describe('Refund amount in centavos (5000 = R$ 50.00). If omitted, refunds full charge amount'),
  comment: z.string().optional().describe('Optional comment or reason for refund'),
});

const getRefundInputSchema = z.object({
  refundID: z.string().describe('Unique refund identifier'),
});

export function registerRefundTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'create_refund',
    {
      description: 'Create a refund for an existing charge. Supports full or partial refunds by specifying amount in centavos (5000 = R$ 50.00). If amount is omitted, refunds the full charge amount. Refunds are charge-scoped (POST /api/v1/charge/{id}/refund). Returns refund object with ID, status, amount, and timestamps. Use for processing customer refund requests, order cancellations, or dispute resolutions.',
      inputSchema: createRefundInputSchema as any,
    },
    async (args: any) => {
      try {
        const refundData = {
          chargeId: args.chargeID,
          amount: args.amount ?? 0,
          ...(args.comment && { reason: args.comment }),
        };
        const result = await wooviClient.createRefund(args.chargeID, refundData as any);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  mcpServer.registerTool(
    'get_refund',
    {
      description: 'Retrieve refund details by refund ID. Returns complete refund information including amount (in centavos), status, associated charge ID, creation timestamp, and processing details. Use for tracking refund status, reconciliation, and customer support inquiries.',
      inputSchema: getRefundInputSchema as any,
    },
    async (args: any) => {
      try {
        const result = await wooviClient.getRefund(args.refundID);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
