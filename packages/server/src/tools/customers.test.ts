import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { WooviClient } from '@woovi/client';
import { registerCustomerTools } from './customers.js';

describe('Customer Tools', () => {
  let mockClient: WooviClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new WooviClient('test-app-id');
  });

  describe('Tool Registration', () => {
    it('should register create_customer tool with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      expect(createCustomerTool).toBeDefined();
      expect(createCustomerTool.description).toContain('Create a new customer');
      expect(createCustomerTool.description).toContain('CPF');
      expect(createCustomerTool.description).toContain('CNPJ');
    });

    it('should register get_customer tool with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const getCustomerTool = registeredTools.find(t => t.name === 'get_customer');
      expect(getCustomerTool).toBeDefined();
      expect(getCustomerTool.description).toContain('Retrieve customer details');
      expect(getCustomerTool.description).toContain('ID or email');
    });

    it('should register list_customers tool with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const listCustomersTool = registeredTools.find(t => t.name === 'list_customers');
      expect(listCustomersTool).toBeDefined();
      expect(listCustomersTool.description).toContain('List all customers');
      expect(listCustomersTool.description).toContain('pagination');
    });
  });

  describe('create_customer validation', () => {
    it('should validate required name field', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const schema = createCustomerTool.inputSchema as z.ZodObject<any>;

      // Valid input should parse
      const validInput = { name: 'Test Customer' };
      expect(() => schema.parse(validInput)).not.toThrow();

      // Invalid input (missing name) should fail
      const invalidInput = {};
      expect(() => schema.parse(invalidInput)).toThrow();
    });

    it('should validate CPF format (11 digits)', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const schema = createCustomerTool.inputSchema as z.ZodObject<any>;

      // Valid CPF (11 digits)
      const validCPF = { name: 'Test', taxID: '12345678901' };
      expect(() => schema.parse(validCPF)).not.toThrow();

      // Invalid CPF (wrong length)
      const invalidCPF = { name: 'Test', taxID: '123456789' };
      expect(() => schema.parse(invalidCPF)).toThrow();
    });

    it('should validate CNPJ format (14 digits)', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const schema = createCustomerTool.inputSchema as z.ZodObject<any>;

      // Valid CNPJ (14 digits)
      const validCNPJ = { name: 'Test Corp', taxID: '12345678901234' };
      expect(() => schema.parse(validCNPJ)).not.toThrow();

      // Invalid CNPJ (wrong length)
      const invalidCNPJ = { name: 'Test Corp', taxID: '123456789012' };
      expect(() => schema.parse(invalidCNPJ)).toThrow();
    });

    it('should validate email format', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const schema = createCustomerTool.inputSchema as z.ZodObject<any>;

      // Valid email
      const validEmail = { name: 'Test', email: 'test@example.com' };
      expect(() => schema.parse(validEmail)).not.toThrow();

      // Invalid email
      const invalidEmail = { name: 'Test', email: 'not-an-email' };
      expect(() => schema.parse(invalidEmail)).toThrow();
    });

    it('should allow optional fields', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerCustomerTools(mockServer as any, mockClient);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const schema = createCustomerTool.inputSchema as z.ZodObject<any>;

      // Name only (all other fields optional)
      const minimalInput = { name: 'Test Customer' };
      expect(() => schema.parse(minimalInput)).not.toThrow();

      // All fields present
      const fullInput = {
        name: 'Test Customer',
        taxID: '12345678901',
        email: 'test@example.com',
        phone: '+5511999999999',
        metadata: { customField: 'value' },
      };
      expect(() => schema.parse(fullInput)).not.toThrow();
    });
  });

  describe('create_customer handler', () => {
    it('should call wooviClient.createCustomer() with correct data', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockCreateCustomer = vi.fn().mockResolvedValue({
        id: 'cust_123',
        name: 'Test Customer',
        email: 'test@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
        createdAt: new Date('2026-02-12T00:00:00Z'),
        updatedAt: new Date('2026-02-12T00:00:00Z'),
      });

      const mockClient = {
        createCustomer: mockCreateCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const result = await createCustomerTool.handler({
        name: 'Test Customer',
        email: 'test@example.com',
        taxID: '12345678901',
      });

      expect(mockCreateCustomer).toHaveBeenCalledWith({
        name: 'Test Customer',
        email: 'test@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('cust_123');
    });

    it('should detect CNPJ from 14-digit taxID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockCreateCustomer = vi.fn().mockResolvedValue({
        id: 'cust_456',
        name: 'Test Corp',
        taxID: { taxID: '12345678901234', type: 'BR:CNPJ' },
        createdAt: new Date('2026-02-12T00:00:00Z'),
        updatedAt: new Date('2026-02-12T00:00:00Z'),
      });

      const mockClient = {
        createCustomer: mockCreateCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      await createCustomerTool.handler({
        name: 'Test Corp',
        taxID: '12345678901234',
      });

      expect(mockCreateCustomer).toHaveBeenCalledWith({
        name: 'Test Corp',
        taxID: { taxID: '12345678901234', type: 'BR:CNPJ' },
      });
    });

    it('should handle API errors correctly', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockCreateCustomer = vi.fn().mockRejectedValue(new Error('API Error'));

      const mockClient = {
        createCustomer: mockCreateCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const createCustomerTool = registeredTools.find(t => t.name === 'create_customer');
      const result = await createCustomerTool.handler({
        name: 'Test Customer',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: API Error');
    });
  });

  describe('get_customer handler', () => {
    it('should call wooviClient.getCustomer() with ID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockGetCustomer = vi.fn().mockResolvedValue({
        id: 'cust_123',
        name: 'Test Customer',
        email: 'test@example.com',
        createdAt: new Date('2026-02-12T00:00:00Z'),
        updatedAt: new Date('2026-02-12T00:00:00Z'),
      });

      const mockClient = {
        getCustomer: mockGetCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const getCustomerTool = registeredTools.find(t => t.name === 'get_customer');
      const result = await getCustomerTool.handler({
        idOrEmail: 'cust_123',
      });

      expect(mockGetCustomer).toHaveBeenCalledWith('cust_123');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('cust_123');
    });

    it('should call wooviClient.getCustomer() with email', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockGetCustomer = vi.fn().mockResolvedValue({
        id: 'cust_456',
        name: 'Email Customer',
        email: 'email@example.com',
        createdAt: new Date('2026-02-12T00:00:00Z'),
        updatedAt: new Date('2026-02-12T00:00:00Z'),
      });

      const mockClient = {
        getCustomer: mockGetCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const getCustomerTool = registeredTools.find(t => t.name === 'get_customer');
      const result = await getCustomerTool.handler({
        idOrEmail: 'email@example.com',
      });

      expect(mockGetCustomer).toHaveBeenCalledWith('email@example.com');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('email@example.com');
    });

    it('should handle API errors correctly', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockGetCustomer = vi.fn().mockRejectedValue(new Error('Customer not found'));

      const mockClient = {
        getCustomer: mockGetCustomer,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const getCustomerTool = registeredTools.find(t => t.name === 'get_customer');
      const result = await getCustomerTool.handler({
        idOrEmail: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Customer not found');
    });
  });

  describe('list_customers handler', () => {
    it('should call wooviClient.listCustomers() with default pagination', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListCustomers = vi.fn().mockResolvedValue({
        items: [
          { id: 'cust_1', name: 'Customer 1' },
          { id: 'cust_2', name: 'Customer 2' },
        ],
        pageInfo: {
          skip: 0,
          limit: 10,
          totalCount: 2,
          hasNextPage: false,
        },
      });

      const mockClient = {
        listCustomers: mockListCustomers,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const listCustomersTool = registeredTools.find(t => t.name === 'list_customers');
      const result = await listCustomersTool.handler({});

      expect(mockListCustomers).toHaveBeenCalledWith({});
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('cust_1');
    });

    it('should pass search and pagination parameters', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListCustomers = vi.fn().mockResolvedValue({
        items: [{ id: 'cust_3', name: 'Searched Customer' }],
        pageInfo: {
          skip: 10,
          limit: 5,
          totalCount: 1,
          hasNextPage: false,
        },
      });

      const mockClient = {
        listCustomers: mockListCustomers,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const listCustomersTool = registeredTools.find(t => t.name === 'list_customers');
      const result = await listCustomersTool.handler({
        search: 'Searched',
        skip: 10,
        limit: 5,
      });

      expect(mockListCustomers).toHaveBeenCalledWith({
        search: 'Searched',
        skip: 10,
        limit: 5,
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('cust_3');
    });

    it('should handle API errors correctly', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListCustomers = vi.fn().mockRejectedValue(new Error('API unavailable'));

      const mockClient = {
        listCustomers: mockListCustomers,
      };

      registerCustomerTools(mockServer as any, mockClient as any);

      const listCustomersTool = registeredTools.find(t => t.name === 'list_customers');
      const result = await listCustomersTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: API unavailable');
    });
  });
});
