import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { maskSensitiveData } from '../utils/masking.js';

const createRefundInputSchema = z.object({
  correlationID: z.string().describe('Unique identifier for this refund'),
  value: z.number().describe('Refund value in centavos (e.g. 5000 = R$ 50.00)'),
  comment: z.string().optional().describe('Comment or reason for the refund'),
});
type CreateRefundInput = z.infer<typeof createRefundInputSchema>;

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
