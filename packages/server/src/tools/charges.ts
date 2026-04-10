import { z } from 'zod';
import type { Address, ChargeInput, WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const centavosSchema = z.number().int().positive();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().trim().min(1);
const isoDateStringSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Must be a valid ISO 8601 date string',
});

const addressSchema = z.object({
  zipcode: nonEmptyStringSchema.optional(),
  street: nonEmptyStringSchema.optional(),
  number: nonEmptyStringSchema.optional(),
  complement: nonEmptyStringSchema.optional(),
  neighborhood: nonEmptyStringSchema.optional(),
  city: nonEmptyStringSchema.optional(),
  state: nonEmptyStringSchema.optional(),
  country: nonEmptyStringSchema.optional(),
});

const createChargeInputSchema = z.object({
  value: centavosSchema.describe('Charge value in centavos (e.g. 5000 = R$ 50.00)'),
  correlationID: nonEmptyStringSchema.describe('Unique identifier for this charge (UUID recommended)'),
  type: z.enum(['DYNAMIC', 'OVERDUE']).optional().describe('Charge type (default: DYNAMIC)'),
  comment: nonEmptyStringSchema.optional().describe('Internal comment for this charge'),
  customer: z.object({
    name: nonEmptyStringSchema,
    email: z.string().email().optional(),
    phone: nonEmptyStringSchema.optional(),
    taxID: nonEmptyStringSchema.optional(),
    correlationID: nonEmptyStringSchema.optional(),
    address: addressSchema.optional(),
  }).optional().describe('Customer associated with this charge'),
  expiresIn: positiveIntegerSchema.optional().describe('Expiration time in seconds'),
  expiresDate: isoDateStringSchema.optional().describe('Explicit expiration date in ISO 8601 format'),
  fixedLocation: z.boolean().optional().describe('Whether to reuse a fixed Pix location'),
  additionalInfo: z.array(z.object({
    key: nonEmptyStringSchema,
    value: nonEmptyStringSchema,
  })).optional().describe('Additional key-value info shown on payment page'),
  redirectUrl: z.string().url().optional().describe('URL to redirect customer after payment'),
  ensureSameTaxID: z.boolean().optional().describe('Ensure payment is made by the same TaxID'),
  discountSettings: z.object({
    modality: z.enum(['fixed', 'percentage']),
    amount: centavosSchema,
  }).optional().describe('Discount settings'),
  splits: z.array(z.object({
    pixKey: nonEmptyStringSchema,
    splitType: z.enum(['fixed', 'percentage']),
    amount: centavosSchema,
  })).optional().describe('Payment split configuration'),
});
type CreateChargeInput = z.infer<typeof createChargeInputSchema>;

const getChargeInputSchema = z.object({
  correlationID: nonEmptyStringSchema.describe('Unique correlation identifier for the charge'),
});
type GetChargeInput = z.infer<typeof getChargeInputSchema>;

const listChargesInputSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']).optional().describe('Filter by charge status'),
  startDate: isoDateStringSchema.optional().describe('Start date filter (ISO 8601 format)'),
  endDate: isoDateStringSchema.optional().describe('End date filter (ISO 8601 format)'),
  skip: nonNegativeIntegerSchema.optional().describe('Number of records to skip for pagination'),
  limit: positiveIntegerSchema.optional().describe('Maximum number of records to return'),
  customer: nonEmptyStringSchema.optional().describe('Filter by Customer CorrelationID'),
  subscription: nonEmptyStringSchema.optional().describe('Filter by subscription identifier'),
});
type ListChargesInput = z.infer<typeof listChargesInputSchema>;

function normalizeChargeCustomer(customer?: CreateChargeInput['customer']): ChargeInput['customer'] {
  if (!customer) {
    return undefined;
  }

  const address = normalizeChargeAddress(customer.address);

  return {
    name: customer.name,
    ...(customer.email && { email: customer.email }),
    ...(customer.phone && { phone: customer.phone }),
    ...(customer.taxID && { taxID: customer.taxID }),
    ...(customer.correlationID && { correlationID: customer.correlationID }),
    ...(address && { address }),
  };
}

function normalizeChargeAddress(address?: CreateChargeInput['customer'] extends infer TCustomer
  ? TCustomer extends { address?: infer TValue }
    ? TValue
    : never
  : never): Address | undefined {
  if (!address) {
    return undefined;
  }

  return {
    ...(address.zipcode && { zipcode: address.zipcode }),
    ...(address.street && { street: address.street }),
    ...(address.number && { number: address.number }),
    ...(address.complement && { complement: address.complement }),
    ...(address.neighborhood && { neighborhood: address.neighborhood }),
    ...(address.city && { city: address.city }),
    ...(address.state && { state: address.state }),
    ...(address.country && { country: address.country }),
  };
}

export function registerChargeTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'create_charge',
    {
      description: 'Create a new Pix charge. Value is in centavos (5000 = R$ 50.00). correlationID must be unique per charge. Returns charge details including brCode (Pix copy-paste), QR code image URL, and payment link.',
      inputSchema: createChargeInputSchema,
    },
    createJsonToolHandler('create_charge', async (args: CreateChargeInput) => {
      const customer = normalizeChargeCustomer(args.customer);
      const chargeData: ChargeInput = {
        value: args.value,
        correlationID: args.correlationID,
        ...(args.type && { type: args.type }),
        ...(args.comment && { comment: args.comment }),
        ...(customer && { customer }),
        ...(args.expiresIn !== undefined && { expiresIn: args.expiresIn }),
        ...(args.expiresDate && { expiresDate: args.expiresDate }),
        ...(args.fixedLocation !== undefined && { fixedLocation: args.fixedLocation }),
        ...(args.additionalInfo && { additionalInfo: args.additionalInfo }),
        ...(args.redirectUrl && { redirectUrl: args.redirectUrl }),
        ...(args.ensureSameTaxID !== undefined && { ensureSameTaxID: args.ensureSameTaxID }),
        ...(args.discountSettings && { discountSettings: args.discountSettings }),
        ...(args.splits && { splits: args.splits }),
      };

      return await wooviClient.createCharge(chargeData);
    }),
  );

  registerZodTool(
    mcpServer,
    'get_charge',
    {
      description: 'Retrieve charge details by correlation ID. Returns complete charge information including status (ACTIVE/COMPLETED/EXPIRED), value in centavos, brCode (copy/paste QR code), QR code image URL, and payment link. Example: get_charge(correlationID: "abc-123-def") returns charge with status "ACTIVE" and brCode "00020126..."',
      inputSchema: getChargeInputSchema,
    },
    createJsonToolHandler('get_charge', async (args: GetChargeInput) => {
      return await wooviClient.getCharge(args.correlationID);
    }),
  );

  registerZodTool(
    mcpServer,
    'list_charges',
    {
      description: 'List charges with optional filters. Supports pagination (skip/limit), status filtering (ACTIVE/COMPLETED/EXPIRED), date range (startDate/endDate), customer filtering by correlation ID, and subscription filtering. Returns paginated results with pageInfo (skip, limit, totalCount, hasPreviousPage, hasNextPage).',
      inputSchema: listChargesInputSchema,
    },
    createJsonToolHandler('list_charges', async (args: ListChargesInput) => {
      return await wooviClient.listCharges({
        ...(args.status && { status: args.status }),
        ...(args.startDate && { startDate: new Date(args.startDate) }),
        ...(args.endDate && { endDate: new Date(args.endDate) }),
        ...(args.skip !== undefined && { skip: args.skip }),
        ...(args.limit !== undefined && { limit: args.limit }),
        ...(args.customer && { customer: args.customer }),
        ...(args.subscription && { subscription: args.subscription }),
      });
    }),
  );
}
