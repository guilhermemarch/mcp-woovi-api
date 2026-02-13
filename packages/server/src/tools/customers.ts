import { z } from 'zod';
import type { WooviClient } from '@woovi/client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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
  metadata: z.record(z.any()).optional().describe('Additional custom fields'),
});

const getCustomerInputSchema = z.object({
  idOrEmail: z.string().describe('Customer ID or email address (auto-detected)'),
});

const listCustomersInputSchema = z.object({
  search: z.string().optional().describe('Search by name, email, or taxID'),
  skip: z.number().optional().describe('Pagination offset (default: 0)'),
  limit: z.number().optional().describe('Max records to return (default: 10)'),
});

export function registerCustomerTools(mcpServer: McpServer, wooviClient: WooviClient) {
  mcpServer.registerTool(
    'create_customer',
    {
      description: 'Create a new customer in the Woovi platform. Requires name and at least one of: taxID, email, or phone. TaxID must be valid Brazilian CPF (11 digits) or CNPJ (14 digits). Returns complete customer object including generated ID, creation timestamp, and all provided fields.',
      inputSchema: createCustomerInputSchema as any,
    },
    async (args: any) => {
      try {
        const customerData: any = {
          name: args.name,
          ...(args.email && { email: args.email }),
          ...(args.phone && { phone: args.phone }),
          ...(args.metadata && { metadata: args.metadata }),
        };

        if (args.taxID) {
          const type = args.taxID.length === 11 ? 'BR:CPF' : 'BR:CNPJ';
          customerData.taxID = {
            taxID: args.taxID,
            type,
          };
        }

        const result = await wooviClient.createCustomer(customerData);
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
    'get_customer',
    {
      description: 'Retrieve customer details by ID or email. Smart detection automatically routes to correct endpoint based on input format. Email detection: contains \'@\' symbol. Returns complete customer object with all fields including masked taxID for security.',
      inputSchema: getCustomerInputSchema as any,
    },
    async (args: any) => {
      try {
        const result = await wooviClient.getCustomer(args.idOrEmail);
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
    'list_customers',
    {
      description: 'List all customers with optional search and pagination. Search filters by name, email, or taxID. Pagination uses offset-based skip/limit pattern. Returns paginated results with totalCount and hasNextPage flag.',
      inputSchema: listCustomersInputSchema as any,
    },
    async (args: any) => {
      try {
        const filters: any = {};
        
        if (args.search !== undefined) {
          filters.search = args.search;
        }
        if (args.skip !== undefined) {
          filters.skip = args.skip;
        }
        if (args.limit !== undefined) {
          filters.limit = args.limit;
        }

        const result = await wooviClient.listCustomers(filters);
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
