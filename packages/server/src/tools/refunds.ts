import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { maskSensitiveData } from '../utils/masking.js';

const createRefundInputSchema = z.object({
  correlationID: z.string().min(1).describe('Unique identifier for this refund'),
  value: z.number().describe('Refund value in centavos (e.g. 5000 = R$ 50.00)'),
  transactionEndToEndId: z.string().min(1).describe('Transaction end-to-end identifier (REQUIRED for standalone refunds)'),
  comment: z.string().optional().describe('Comment or reason for the refund'),
});
type CreateRefundInput = z.infer<typeof createRefundInputSchema>;

const createChargeRefundInputSchema = z.object({
  chargeID: z.string().min(1).describe('Charge ID to refund'),
  value: z.number().optional().describe('Refund value in centavos (optional, full charge refund if omitted)'),
  correlationID: z.string().optional().describe('Unique correlation identifier'),
  description: z.string().optional().describe('Refund description'),
});
type CreateChargeRefundInput = z.infer<typeof createChargeRefundInputSchema>;

const getRefundInputSchema = z.object({
  refundID: z.string().describe('Unique refund identifier'),
});
type GetRefundInput = z.infer<typeof getRefundInputSchema>;

export function registerRefundTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'create_refund',
    {
      description: 'Create a refund via POST /api/v1/refund. Requires a unique correlationID and value in centavos. Returns the refund object with status and timestamps.',
      inputSchema: createRefundInputSchema as any,
    },
    async (args: CreateRefundInput) => {
      try {
        const refundData = {
          correlationID: args.correlationID,
          value: args.value,
          transactionEndToEndId: args.transactionEndToEndId,
          ...(args.comment && { comment: args.comment }),
        };
        const result = await wooviClient.createRefund(refundData as any);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(maskSensitiveData(result), null, 2) || '{}' }],
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
    'create_charge_refund',
    {
      description: 'Create a refund for a specific charge via POST /api/v1/charge/{chargeID}/refund. Returns the refund object with status and timestamps.',
      inputSchema: createChargeRefundInputSchema as any,
    },
    async (args: CreateChargeRefundInput) => {
      try {
        const refundData = {
          ...(args.value !== undefined && { value: args.value }),
          ...(args.correlationID && { correlationID: args.correlationID }),
          ...(args.description && { description: args.description }),
        };
        const result = await wooviClient.createChargeRefund(args.chargeID, refundData as any);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(maskSensitiveData(result), null, 2) || '{}' }],
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
    'get_refund',
    {
      description: 'Retrieve refund details by refund ID. Returns complete refund information including value (in centavos), status, and timestamps.',
      inputSchema: getRefundInputSchema as any,
    },
    async (args: GetRefundInput) => {
      try {
        const result = await wooviClient.getRefund(args.refundID);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(maskSensitiveData(result), null, 2) || '{}' }],
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
