import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { WooviClient } from '@woovi/client';
import { registerTransactionTools } from './transactions.js';

describe('Transaction Tools', () => {
  let mockClient: WooviClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new WooviClient('test-app-id');
  });

  describe('get_transactions tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerTransactionTools(mockServer as any, mockClient);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      expect(getTransactionsTool).toBeDefined();
      expect(getTransactionsTool.description).toContain('Pix transactions');
      expect(getTransactionsTool.description).toContain('ISO 8601');
    });

    it('should validate input with Zod schema for date filters and pagination', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerTransactionTools(mockServer as any, mockClient);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      const schema = getTransactionsTool.inputSchema as z.ZodObject<any>;

      // Valid input with all fields
      expect(() => schema.parse({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        skip: 0,
        limit: 10,
      })).not.toThrow();

      // Valid input with no fields (all optional)
      expect(() => schema.parse({})).not.toThrow();

      // Valid input with ISO 8601 timestamp format
      expect(() => schema.parse({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
      })).not.toThrow();
    });

    it('should call wooviClient.listTransactions() with correct parameters', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListTransactions = vi.fn().mockResolvedValue({
        transactions: [
          {
            id: 'txn-1',
            chargeId: 'charge-1',
            amount: 5000,
            type: 'CREDIT',
            status: 'completed',
            createdAt: new Date('2026-02-12T00:00:00Z'),
          },
        ],
        pageInfo: { skip: 0, limit: 10, totalCount: 1,
          hasPreviousPage: false,
          hasNextPage: false },
      });

      const mockClient = {
        listTransactions: mockListTransactions,
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      await getTransactionsTool.handler({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        skip: 10,
        limit: 20,
      });

      expect(mockListTransactions).toHaveBeenCalledWith({
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        skip: 10,
        limit: 20,
      });
    });

    it('should call wooviClient.listTransactions() without filters when none provided', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        pageInfo: { skip: 0, limit: 10, totalCount: 0,
          hasPreviousPage: false,
          hasNextPage: false },
      });

      const mockClient = {
        listTransactions: mockListTransactions,
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      await getTransactionsTool.handler({});

      expect(mockListTransactions).toHaveBeenCalledWith({});
    });

    it('should return MCP-compliant response format with transaction data', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        listTransactions: vi.fn().mockResolvedValue({
          transactions: [
            { id: 'txn-1', amount: 5000, type: 'CREDIT', status: 'completed' },
            { id: 'txn-2', amount: 3000, type: 'DEBIT', status: 'completed' },
          ],
          pageInfo: { skip: 0, limit: 10, totalCount: 2,
          hasPreviousPage: false,
          hasNextPage: false },
        }),
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      const result = await getTransactionsTool.handler({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('txn-1');
      expect(result.content[0].text).toContain('txn-2');
    });

    it('should handle date range parameters correctly', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        pageInfo: { skip: 0, limit: 10, totalCount: 0,
          hasPreviousPage: false,
          hasNextPage: false },
      });

      const mockClient = {
        listTransactions: mockListTransactions,
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      await getTransactionsTool.handler({
        startDate: '2026-02-01T00:00:00Z',
        endDate: '2026-02-28T23:59:59Z',
      });

      expect(mockListTransactions).toHaveBeenCalledWith({
        startDate: new Date('2026-02-01T00:00:00Z'),
        endDate: new Date('2026-02-28T23:59:59Z'),
      });
    });

    it('should handle pagination parameters correctly', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        pageInfo: { skip: 20, limit: 5, totalCount: 0,
          hasPreviousPage: true,
          hasNextPage: false },
      });

      const mockClient = {
        listTransactions: mockListTransactions,
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      await getTransactionsTool.handler({ skip: 20, limit: 5 });

      expect(mockListTransactions).toHaveBeenCalledWith({
        skip: 20,
        limit: 5,
      });
    });

    it('should handle errors with isError flag', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        listTransactions: vi.fn().mockRejectedValue(new Error('API failure')),
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getTransactionsTool = registeredTools.find(t => t.name === 'get_transactions');
      const result = await getTransactionsTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('API failure');
    });
  });

  describe('get_balance tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerTransactionTools(mockServer as any, mockClient);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      expect(getBalanceTool).toBeDefined();
      expect(getBalanceTool.description).toContain('balance');
      expect(getBalanceTool.description).toContain('cached');
      expect(getBalanceTool.description).toContain('60 seconds');
    });

    it('should validate input with Zod schema (no required parameters)', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerTransactionTools(mockServer as any, mockClient);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      const schema = getBalanceTool.inputSchema as z.ZodObject<any>;

      // Empty input should parse (no required fields)
      expect(() => schema.parse({})).not.toThrow();
    });

     it('should call wooviClient.getBalance() with no arguments', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockGetBalance = vi.fn().mockResolvedValue({
        total: 100000,
        blocked: 5000,
        available: 95000,
      });

      const mockClient = {
        getBalance: mockGetBalance,
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      await getBalanceTool.handler({});

      expect(mockGetBalance).toHaveBeenCalledWith();
    });

     it('should return MCP-compliant response format with balance data', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        getBalance: vi.fn().mockResolvedValue({
          total: 100000,
          blocked: 5000,
          available: 95000,
        }),
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      const result = await getBalanceTool.handler({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('100000');
      expect(result.content[0].text).toContain('5000');
    });

     it('should return balance in centavos', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        getBalance: vi.fn().mockResolvedValue({
          total: 50000,
          blocked: 0,
          available: 50000,
        }),
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      const result = await getBalanceTool.handler({});

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.available).toBe(50000);
    });

    it('should handle errors with isError flag', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        getBalance: vi.fn().mockRejectedValue(new Error('API failure')),
      };

      registerTransactionTools(mockServer as any, mockClient as any);

      const getBalanceTool = registeredTools.find(t => t.name === 'get_balance');
      const result = await getBalanceTool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('API failure');
    });
  });
});
