import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { WooviClient } from '@woovi/client';
import { registerChargeTools } from './charges.js';

describe('Charge Tools', () => {
  let mockClient: WooviClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new WooviClient('test-app-id');
  });

  describe('create_charge tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
      expect(createChargeTool).toBeDefined();
      expect(createChargeTool.description).toContain('centavos');
    });

    it('should validate input with Zod schema requiring value and correlationID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
      const schema = createChargeTool.inputSchema as z.ZodObject<any>;

      // Valid input should parse
      const validInput = {
        value: 5000,
        correlationID: 'test-uuid-123',
      };
      expect(() => schema.parse(validInput)).not.toThrow();

      // Invalid input (missing value) should fail
      const invalidInput = { correlationID: 'test-uuid' };
      expect(() => schema.parse(invalidInput)).toThrow();

      // Invalid input (missing correlationID) should fail
      const invalidInput2 = { value: 5000 };
      expect(() => schema.parse(invalidInput2)).toThrow();
    });

    it('should call wooviClient.createCharge() with correct data', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockCreateCharge = vi.fn().mockResolvedValue({
        value: 5000,
        correlationID: 'test-123',
        identifier: 'id-1',
        transactionID: 'tx-1',
        status: 'ACTIVE',
        brCode: 'br-code',
        qrCodeImage: 'data:image',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-1',
        createdAt: '2026-02-12T00:00:00Z',
        updatedAt: '2026-02-12T00:00:00Z',
      });

      const mockClient = {
        createCharge: mockCreateCharge,
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
      const result = await createChargeTool.handler({
        value: 5000,
        correlationID: 'test-123',
        customer: { name: 'Test Customer', email: 'test@example.com' },
      });

      expect(mockCreateCharge).toHaveBeenCalledWith({
        value: 5000,
        correlationID: 'test-123',
        customer: { name: 'Test Customer', email: 'test@example.com' },
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('br-code');
    });

    it('should return MCP-compliant response format', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        createCharge: vi.fn().mockResolvedValue({ correlationID: 'test', value: 1000 }),
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
      const result = await createChargeTool.handler({ value: 1000, correlationID: 'test' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should handle errors with isError flag', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        createCharge: vi.fn().mockRejectedValue(new Error('API failure')),
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const createChargeTool = registeredTools.find(t => t.name === 'create_charge');
      const result = await createChargeTool.handler({ value: 1000, correlationID: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('API failure');
    });
  });

  describe('get_charge tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
      expect(getChargeTool).toBeDefined();
      expect(getChargeTool.description).toBeTruthy();
    });

    it('should validate input with Zod schema requiring correlationID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
      const schema = getChargeTool.inputSchema as z.ZodObject<any>;

      // Valid input should parse
      expect(() => schema.parse({ correlationID: 'test-123' })).not.toThrow();

      // Invalid input (missing correlationID) should fail
      expect(() => schema.parse({})).toThrow();
    });

    it('should call wooviClient.getCharge() with correlationID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockGetCharge = vi.fn().mockResolvedValue({
        value: 5000,
        correlationID: 'test-123',
        identifier: 'id-1',
        transactionID: 'tx-1',
        status: 'ACTIVE',
        brCode: 'br-code',
        paymentLinkUrl: 'url',
        qrCodeImage: 'qr',
        pixKey: 'pix',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-1',
        createdAt: '2026-02-12T00:00:00Z',
        updatedAt: '2026-02-12T00:00:00Z',
      });

      const mockClient = {
        getCharge: mockGetCharge,
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const getChargeTool = registeredTools.find(t => t.name === 'get_charge');
      await getChargeTool.handler({ correlationID: 'test-123' });

      expect(mockGetCharge).toHaveBeenCalledWith('test-123');
    });
  });

  describe('list_charges tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
      expect(listChargesTool).toBeDefined();
      expect(listChargesTool.description).toBeTruthy();
    });

    it('should validate input with Zod schema for status, dates, pagination', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerChargeTools(mockServer as any, mockClient);

      const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
      const schema = listChargesTool.inputSchema as z.ZodObject<any>;

      // Valid input with all fields (UPPERCASE status)
      expect(() => schema.parse({
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        skip: 0,
        limit: 10,
      })).not.toThrow();

      // Valid input with no fields (all optional)
      expect(() => schema.parse({})).not.toThrow();

      // Invalid status should fail
      expect(() => schema.parse({ status: 'invalid' })).toThrow();
    });

    it('should call wooviClient.listCharges() with filters', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockListCharges = vi.fn().mockResolvedValue({
        items: [],
        pageInfo: { skip: 0, limit: 10, totalCount: 0, hasNextPage: false },
      });

      const mockClient = {
        listCharges: mockListCharges,
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
      await listChargesTool.handler({ status: 'ACTIVE', skip: 10, limit: 20 });

      expect(mockListCharges).toHaveBeenCalledWith({
        status: 'ACTIVE',
        skip: 10,
        limit: 20,
      });
    });

    it('should return paginated results in MCP format', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        listCharges: vi.fn().mockResolvedValue({
          items: [{ correlationID: 'id1' }, { correlationID: 'id2' }],
          pageInfo: { skip: 0, limit: 10, totalCount: 2, hasNextPage: false },
        }),
      };

      registerChargeTools(mockServer as any, mockClient as any);

      const listChargesTool = registeredTools.find(t => t.name === 'list_charges');
      const result = await listChargesTool.handler({});

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('id1');
      expect(result.content[0].text).toContain('id2');
    });
  });
});
