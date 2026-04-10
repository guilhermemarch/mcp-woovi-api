import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { WooviClient } from '@woovi/client';
import { registerRefundTools } from '../../../src/tools/refunds.js';

describe('Refund Tools', () => {
  let mockClient: WooviClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new WooviClient('test-app-id');
  });

  describe('create_refund tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerRefundTools(mockServer as any, mockClient);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      expect(createRefundTool).toBeDefined();
      expect(createRefundTool.description).toContain('centavos');
    });

    it('should validate input with Zod schema requiring correlationID and value', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerRefundTools(mockServer as any, mockClient);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const schema = createRefundTool.inputSchema as z.ZodObject<any>;

      // Valid input should parse
      const validInput = {
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'e2e-123',
      };
      expect(() => schema.parse(validInput)).not.toThrow();

      expect(() => schema.parse({ value: 5000, transactionEndToEndId: 'e2e-123' })).toThrow();

      expect(() => schema.parse({ correlationID: 'test', transactionEndToEndId: 'e2e-123' })).toThrow();
      expect(() => schema.parse({
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'e2e-123',
        chargeID: 'charge-123',
      })).toThrow();
    });

    it('should validate value is a number', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerRefundTools(mockServer as any, mockClient);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const schema = createRefundTool.inputSchema as z.ZodObject<any>;

      // Valid input with value
      const validInput = {
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'e2e-123',
      };
      expect(() => schema.parse(validInput)).not.toThrow();

      const invalidInput = {
        correlationID: 'refund-corr-1',
        value: 'not-a-number',
        transactionEndToEndId: 'e2e-123',
      };
      expect(() => schema.parse(invalidInput)).toThrow();
    });

    it('should call wooviClient.createRefund() with correct data', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockCreateRefund = vi.fn().mockResolvedValue({
        refundId: 'refund-id-1',
        correlationID: 'refund-corr-1',
        value: 5000,
        status: 'COMPLETED',
        time: '2026-02-12T00:00:00Z',
      });

      const mockClient = {
        createRefund: mockCreateRefund,
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const result = await createRefundTool.handler({
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'e2e-123',
      });

      expect(mockCreateRefund).toHaveBeenCalledWith({
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'e2e-123',
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('refund-corr-1');
    });

    it('should include comment when provided', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

       const mockCreateRefund = vi.fn().mockResolvedValue({
        refundId: 'refund-id-2',
        correlationID: 'refund-corr-2',
        value: 2500,
        status: 'COMPLETED',
        comment: 'Customer request',
        time: '2026-02-12T00:00:00Z',
      });

      const mockClient = {
        createRefund: mockCreateRefund,
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const result = await createRefundTool.handler({
        correlationID: 'refund-corr-2',
        value: 2500,
        transactionEndToEndId: 'e2e-456',
        comment: 'Customer request',
      });

      expect(mockCreateRefund).toHaveBeenCalledWith({
        correlationID: 'refund-corr-2',
        value: 2500,
        transactionEndToEndId: 'e2e-456',
        comment: 'Customer request',
      });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('refund-corr-2');
    });

    it('should map charge refund comments to the charge refund payload comment field', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const createChargeRefund = vi.fn().mockResolvedValue({
        refundId: 'charge-refund-id-1',
        correlationID: 'charge-refund-1',
        value: 5000,
        status: 'IN_PROCESSING',
        comment: 'Charge refund comment',
        time: '2026-02-12T00:00:00Z',
      });

      registerRefundTools(mockServer as any, { createChargeRefund } as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      await createRefundTool.handler({
        chargeID: 'charge-123',
        correlationID: 'charge-refund-1',
        value: 5000,
        comment: 'Charge refund comment',
      });

      expect(createChargeRefund).toHaveBeenCalledWith('charge-123', {
        correlationID: 'charge-refund-1',
        value: 5000,
        comment: 'Charge refund comment',
      });
    });

    it('should return MCP-compliant response format', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

       const mockClient = {
        createRefund: vi.fn().mockResolvedValue({
          refundId: 'refund-id-789',
          correlationID: 'refund-corr-789',
          value: 1000,
          status: 'COMPLETED',
          time: '2026-02-12T00:00:00Z',
        }),
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const result = await createRefundTool.handler({ correlationID: 'refund-corr-789', value: 1000, transactionEndToEndId: 'e2e-789' });

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
        createRefund: vi.fn().mockRejectedValue(new Error('API failure')),
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const result = await createRefundTool.handler({ correlationID: 'test', value: 1000, transactionEndToEndId: 'e2e-test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('API failure');
    });

    it('should use charge refund flow when chargeID is provided', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const createChargeRefund = vi.fn().mockResolvedValue({
        refundId: 'charge-refund-id-1',
        correlationID: 'charge-refund-1',
        value: 5000,
        status: 'IN_PROCESSING',
        time: '2026-02-12T00:00:00Z',
      });

      registerRefundTools(mockServer as any, { createChargeRefund } as any);

      const createRefundTool = registeredTools.find(t => t.name === 'create_refund');
      const result = await createRefundTool.handler({
        chargeID: 'charge-123',
        correlationID: 'charge-refund-1',
        value: 5000,
      });

      expect(createChargeRefund).toHaveBeenCalledWith(
        'charge-123',
        {
          correlationID: 'charge-refund-1',
          value: 5000,
        }
      );
      expect(result.content[0].text).toContain('charge-refund-1');
    });
  });

  describe('get_refund tool', () => {
    it('should register with correct name and description', () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerRefundTools(mockServer as any, mockClient);

      const getRefundTool = registeredTools.find(t => t.name === 'get_refund');
      expect(getRefundTool).toBeDefined();
      expect(getRefundTool.description).toBeTruthy();
    });

    it('should validate input with Zod schema requiring refundID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      registerRefundTools(mockServer as any, mockClient);

      const getRefundTool = registeredTools.find(t => t.name === 'get_refund');
      const schema = getRefundTool.inputSchema as z.ZodObject<any>;

      // Valid input should parse
      expect(() => schema.parse({ refundID: 'refund-123' })).not.toThrow();

      // Invalid input (missing refundID) should fail
      expect(() => schema.parse({})).toThrow();
    });

    it('should call wooviClient.getRefund() with refundID', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

       const mockGetRefund = vi.fn().mockResolvedValue({
        refundId: 'refund-id-123',
        correlationID: 'refund-123',
        value: 5000,
        status: 'COMPLETED',
        time: '2026-02-12T00:00:00Z',
      });

      const mockClient = {
        getRefund: mockGetRefund,
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const getRefundTool = registeredTools.find(t => t.name === 'get_refund');
      await getRefundTool.handler({ refundID: 'refund-123' });

      expect(mockGetRefund).toHaveBeenCalledWith('refund-123');
    });

    it('should return MCP-compliant response with refund details', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

       const mockClient = {
        getRefund: vi.fn().mockResolvedValue({
          refundId: 'refund-id-999',
          correlationID: 'refund-999',
          value: 3000,
          status: 'COMPLETED',
          time: '2026-02-12T00:00:00Z',
        }),
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const getRefundTool = registeredTools.find(t => t.name === 'get_refund');
      const result = await getRefundTool.handler({ refundID: 'refund-999' });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('refund-999');
    });

    it('should handle errors with isError flag', async () => {
      const registeredTools: any[] = [];
      const mockServer = {
        registerTool: vi.fn((name, config, handler) => {
          registeredTools.push({ name, ...config, handler });
        }),
      };

      const mockClient = {
        getRefund: vi.fn().mockRejectedValue(new Error('Refund not found')),
      };

      registerRefundTools(mockServer as any, mockClient as any);

      const getRefundTool = registeredTools.find(t => t.name === 'get_refund');
      const result = await getRefundTool.handler({ refundID: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
      expect(result.content[0].text).toContain('Refund not found');
    });
  });
});
