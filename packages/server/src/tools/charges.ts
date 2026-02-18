import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { maskSensitiveData } from '../utils/masking.js';

const createChargeInputSchema = z.object({
  value: z.number().describe('Charge value in centavos (e.g. 5000 = R$ 50.00)'),
  correlationID: z.string().describe('Unique identifier for this charge (UUID recommended)'),
  type: z.enum(['DYNAMIC', 'OVERDUE', 'BOLETO']).optional().describe('Charge type (default: DYNAMIC)'),
  comment: z.string().optional().describe('Internal comment for this charge'),
  customer: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    taxID: z.string().optional(),
  }).optional().describe('Customer associated with this charge'),
  expiresIn: z.number().optional().describe('Expiration time in seconds'),
  additionalInfo: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional().describe('Additional key-value info shown on payment page'),
  redirectUrl: z.string().optional().describe('URL to redirect customer after payment'),
  ensureSameTaxID: z.boolean().optional().describe('Ensure payment is made by the same TaxID'),
  discountSettings: z.object({
    modality: z.enum(['fixed', 'percentage']),
    amount: z.number(),
  }).optional().describe('Discount settings'),
  splits: z.array(z.object({
    pixKey: z.string(),
    splitType: z.enum(['fixed', 'percentage']),
    amount: z.number(),
  })).optional().describe('Payment split configuration'),
});
type CreateChargeInput = z.infer<typeof createChargeInputSchema>;

const getChargeInputSchema = z.object({
  correlationID: z.string().describe('Unique correlation identifier for the charge'),
});
type GetChargeInput = z.infer<typeof getChargeInputSchema>;

const listChargesInputSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']).optional().describe('Filter by charge status'),
  startDate: z.string().optional().describe('Start date filter (ISO 8601 format)'),
  endDate: z.string().optional().describe('End date filter (ISO 8601 format)'),
  skip: z.number().optional().describe('Number of records to skip for pagination'),
  limit: z.number().optional().describe('Maximum number of records to return'),
});
type ListChargesInput = z.infer<typeof listChargesInputSchema>;

export function registerChargeTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'create_charge',
    {
      description: 'Create a new Pix charge. Value is in centavos (5000 = R$ 50.00). correlationID must be unique per charge. Returns charge details including brCode (Pix copy-paste), QR code image URL, and payment link.',
      inputSchema: createChargeInputSchema as any,
    },
    async (args: CreateChargeInput) => {
      try {
        const chargeData = {
          value: args.value,
          correlationID: args.correlationID,
          ...(args.type && { type: args.type }),
          ...(args.comment && { comment: args.comment }),
          ...(args.customer && { customer: args.customer }),
          ...(args.expiresIn && { expiresIn: args.expiresIn }),
          ...(args.additionalInfo && { additionalInfo: args.additionalInfo }),
          ...(args.redirectUrl && { redirectUrl: args.redirectUrl }),
          ...(args.ensureSameTaxID && { ensureSameTaxID: args.ensureSameTaxID }),
          ...(args.discountSettings && { discountSettings: args.discountSettings }),
          ...(args.splits && { splits: args.splits }),
        };
        const result = await wooviClient.createCharge(chargeData as any);
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
    'get_charge',
    {
      description: 'Retrieve charge details by correlation ID. Returns complete charge information including status, value, brCode, QR code, and payment link.',
      inputSchema: getChargeInputSchema as any,
    },
    async (args: GetChargeInput) => {
      try {
        const result = await wooviClient.getCharge(args.correlationID);
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
    'list_charges',
    {
      description: 'List charges with optional filters. Supports pagination (skip/limit), status filtering (ACTIVE/COMPLETED/EXPIRED), and date range. Returns paginated results.',
      inputSchema: listChargesInputSchema as any,
    },
    async (args: ListChargesInput) => {
      try {
        const filters = {
          ...(args.status && { status: args.status }),
          ...(args.startDate && { startDate: new Date(args.startDate) }),
          ...(args.endDate && { endDate: new Date(args.endDate) }),
          ...(args.skip !== undefined && { skip: args.skip }),
          ...(args.limit !== undefined && { limit: args.limit }),
        };
        const result = await wooviClient.listCharges(filters);
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
