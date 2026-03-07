import { z } from 'zod';
import type { Address, WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerZodTool } from '../utils/mcp-registration.js';
import { createJsonToolHandler } from '../utils/tool-handler.js';

const createCustomerInputSchema = z.object({
  name: z.string().describe('Customer full name'),
  taxID: z.string()
    .refine(val => /^\d{11}$|^\d{14}$/.test(val), {
      message: 'Invalid CPF or CNPJ format (must be 11 or 14 digits)',
    })
    .optional()
    .describe('Brazilian tax ID (CPF: 11 digits, CNPJ: 14 digits)'),
  email: z.string().email().optional().describe('Customer email address'),
  phone: z.string().optional().describe('Customer phone number'),
  correlationID: z.string().optional().describe('Optional external correlation ID for the customer'),
  address: z.object({
    zipcode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional().describe('Optional customer address'),
}).refine(
  (value) => Boolean(value.taxID || value.email || value.phone),
  'Provide at least one of: taxID, email, or phone'
);
type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

const getCustomerInputSchema = z.object({
  customerId: z.string().describe('Customer correlation ID or tax ID'),
});
type GetCustomerInput = z.infer<typeof getCustomerInputSchema>;

const listCustomersInputSchema = z.object({
  search: z.string().optional().describe('Search by name, email, or taxID'),
  skip: z.number().optional().describe('Pagination offset (default: 0)'),
  limit: z.number().optional().describe('Max records to return (default: 10)'),
});
type ListCustomersInput = z.infer<typeof listCustomersInputSchema>;

function normalizeAddress(address?: CreateCustomerInput['address']): Address | undefined {
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

export function registerCustomerTools(mcpServer: McpServer, wooviClient: WooviClient) {
  registerZodTool(
    mcpServer,
    'create_customer',
    {
      description: 'Create a new customer in the Woovi platform. Requires name and at least one of: taxID, email, or phone. TaxID must be valid Brazilian CPF (11 digits) or CNPJ (14 digits). Returns complete customer object including generated ID, creation timestamp, and all provided fields.',
      inputSchema: createCustomerInputSchema,
    },
    createJsonToolHandler('create_customer', async (args: CreateCustomerInput) => {
      const address = normalizeAddress(args.address);

      return await wooviClient.createCustomer({
        name: args.name,
        ...(args.email && { email: args.email }),
        ...(args.phone && { phone: args.phone }),
        ...(args.correlationID && { correlationID: args.correlationID }),
        ...(args.taxID && { taxID: args.taxID }),
        ...(address && { address }),
      });
    }),
  );

  registerZodTool(
    mcpServer,
    'get_customer',
    {
      description: 'Retrieve customer details by correlation ID or tax ID using the official Woovi customer lookup endpoint. Returns the complete customer object with sensitive fields masked in the MCP response.',
      inputSchema: getCustomerInputSchema,
    },
    createJsonToolHandler('get_customer', async (args: GetCustomerInput) => {
      return await wooviClient.getCustomer(args.customerId);
    }),
  );

  registerZodTool(
    mcpServer,
    'list_customers',
    {
      description: 'List customers with pagination and an optional search string. Pagination uses offset-based skip/limit. Search is applied by this MCP server over the fetched customer page using name, email, phone, correlationID, or taxID.',
      inputSchema: listCustomersInputSchema,
    },
    createJsonToolHandler('list_customers', async (args: ListCustomersInput) => {
      return await wooviClient.listCustomers({
        ...(args.search !== undefined && { search: args.search }),
        ...(args.skip !== undefined && { skip: args.skip }),
        ...(args.limit !== undefined && { limit: args.limit }),
      });
    }),
  );
}
