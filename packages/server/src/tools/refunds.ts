import { z } from 'zod';
import type { ChargeRefundInput, RefundInput, WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const createRefundInputSchema = z.object({
  correlationID: z.string().min(1).describe('Unique identifier for this refund'),
  value: z.number().describe('Refund value in centavos (e.g. 5000 = R$ 50.00)'),
  transactionEndToEndId: z.string().min(1).optional().describe('Transaction end-to-end identifier for standalone refunds'),
  chargeID: z.string().min(1).optional().describe('Charge ID or correlationID to refund when using the charge refund flow'),
  comment: z.string().optional().describe('Comment or reason for the refund'),
}).refine(
  (value) => Boolean(value.transactionEndToEndId || value.chargeID),
  'Provide either chargeID or transactionEndToEndId to create a refund'
);
type CreateRefundInput = z.infer<typeof createRefundInputSchema>;

const getRefundInputSchema = z.object({
  refundID: z.string().describe('Unique refund identifier'),
});
type GetRefundInput = z.infer<typeof getRefundInputSchema>;

export function registerRefundTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'create_refund',
    {
      description: 'Create a refund for a charge or Pix transaction. Provide chargeID to use POST /api/v1/charge/{id}/refund, or transactionEndToEndId to use POST /api/v1/refund. Always include a unique correlationID and the refund value in centavos.',
      inputSchema: createRefundInputSchema,
    },
    createJsonToolHandler('create_refund', async (args: CreateRefundInput) => {
      return args.chargeID
        ? await wooviClient.createChargeRefund(args.chargeID, {
            correlationID: args.correlationID,
            value: args.value,
            ...(args.comment && { description: args.comment }),
          } satisfies ChargeRefundInput)
        : await wooviClient.createRefund({
            correlationID: args.correlationID,
            value: args.value,
            transactionEndToEndId: args.transactionEndToEndId!,
            ...(args.comment && { comment: args.comment }),
          } satisfies RefundInput);
    }),
  );

  registerZodTool(
    mcpServer,
    'get_refund',
    {
      description: 'Retrieve refund details by refund ID. Returns complete refund information including value (in centavos), status, and timestamps.',
      inputSchema: getRefundInputSchema,
    },
    createJsonToolHandler('get_refund', async (args: GetRefundInput) => {
      return await wooviClient.getRefund(args.refundID);
    }),
  );
}
