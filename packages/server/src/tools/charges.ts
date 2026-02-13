import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const createChargeInputSchema = z.object({
  amount: z.number().describe('Amount value in centavos (5000 = R$ 50.00)'),
  description: z.string().optional(),
  customer: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    taxID: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

const getChargeInputSchema = z.object({
  correlationID: z.string().describe('Unique correlation identifier for the charge'),
});

const listChargesInputSchema = z.object({
  status: z.enum(['active', 'completed', 'expired']).optional().describe('Filter by charge status'),
  startDate: z.string().optional().describe('Start date filter (ISO 8601 format)'),
  endDate: z.string().optional().describe('End date filter (ISO 8601 format)'),
  skip: z.number().optional().describe('Number of records to skip for pagination'),
  limit: z.number().optional().describe('Maximum number of records to return'),
});

export function registerChargeTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'create_charge',
    {
      description: 'Create a new charge (Pix payment request). Amount value is in centavos (5000 = R$ 50.00). Returns charge details including QR code and Pix copy-paste code.',
      inputSchema: createChargeInputSchema as any,
    },
    async (args: any) => {
      try {
        const chargeData = {
          amount: args.amount,
          description: args.description || '',
          ...(args.customer && { customer: args.customer }),
          ...(args.metadata && { metadata: args.metadata }),
        };
        const result = await wooviClient.createCharge(chargeData as any);
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
    'get_charge',
    {
      description: 'Retrieve charge details by correlation ID. Returns complete charge information including status, amount, and payment codes.',
      inputSchema: getChargeInputSchema as any,
    },
    async (args: any) => {
      try {
        const result = await wooviClient.getCharge(args.correlationID);
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
    'list_charges',
    {
      description: 'List charges with optional filters. Supports pagination (skip/limit), status filtering (active/completed/expired), and date range filtering. Returns paginated results.',
      inputSchema: listChargesInputSchema as any,
    },
    async (args: any) => {
      try {
        const filters = {
          ...(args.status && { status: args.status }),
          ...(args.startDate && { startDate: args.startDate }),
          ...(args.endDate && { endDate: args.endDate }),
          ...(args.skip !== undefined && { skip: args.skip }),
          ...(args.limit !== undefined && { limit: args.limit }),
        };
        const result = await wooviClient.listCharges(filters);
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
