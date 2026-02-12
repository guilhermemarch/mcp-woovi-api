import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from './client';
import type { ChargeInput, Charge, PaginatedResult, PageInfo } from './types';

describe('WooviClient - Charge Methods', () => {
  let client: WooviClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new WooviClient('test-app-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCharge', () => {
    it('should POST to /api/openpix/v1/charge endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'charge-123',
          amount: 5000,
          description: 'Test charge',
          status: 'PENDING',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      const chargeInput: ChargeInput = {
        amount: 5000,
        description: 'Test charge',
      };

      await client.createCharge(chargeInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openpix.com.br/api/openpix/v1/charge',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send ChargeInput as JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'charge-123',
          amount: 5000,
          description: 'Test charge',
          status: 'PENDING',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      const chargeInput: ChargeInput = {
        amount: 5000,
        description: 'Test charge',
      };

      await client.createCharge(chargeInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(chargeInput),
        })
      );
    });

    it('should return Charge object with all fields', async () => {
      const chargeResponse: Charge = {
        id: 'charge-456',
        amount: 10000,
        description: 'Product purchase',
        status: 'PENDING',
        createdAt: new Date('2025-02-12T10:00:00Z'),
        updatedAt: new Date('2025-02-12T10:00:00Z'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => chargeResponse,
      });

      const result = await client.createCharge({
        amount: 10000,
        description: 'Product purchase',
      });

      expect(result).toEqual(chargeResponse);
      expect(result.amount).toBe(10000); // Verify centavos
    });

    it('should handle amount in centavos (integer)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'charge-789',
          amount: 50000, // R$ 500.00 in centavos
          description: 'High value charge',
          status: 'PENDING',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      const result = await client.createCharge({
        amount: 50000,
        description: 'High value charge',
      });

      expect(result.amount).toBe(50000);
      expect(Number.isInteger(result.amount)).toBe(true);
    });
  });

  describe('getCharge', () => {
    it('should GET from /api/v1/charge/{correlationID} endpoint', async () => {
      const chargeId = 'charge-abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: chargeId,
          amount: 5000,
          description: 'Test charge',
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      await client.getCharge(chargeId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/charge/${chargeId}`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should URL-encode correlationID with special characters', async () => {
      const chargeIdWithSpaces = 'charge abc/123';
      const encodedId = encodeURIComponent(chargeIdWithSpaces);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: chargeIdWithSpaces,
          amount: 5000,
          description: 'Test charge',
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      await client.getCharge(chargeIdWithSpaces);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/charge/${encodedId}`,
        expect.any(Object)
      );
    });

    it('should return Charge object', async () => {
      const chargeResponse: Charge = {
        id: 'charge-def456',
        amount: 15000,
        description: 'Service charge',
        status: 'COMPLETED',
        createdAt: new Date('2025-02-12T10:00:00Z'),
        updatedAt: new Date('2025-02-12T10:00:00Z'),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => chargeResponse,
      });

      const result = await client.getCharge('charge-def456');

      expect(result).toEqual(chargeResponse);
      expect(result.id).toBe('charge-def456');
    });
  });

  describe('listCharges', () => {
    it('should GET from /api/v1/charge/ with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      await client.listCharges();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/charge/'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should use offset pagination with skip and limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 20,
            limit: 10,
            totalCount: 100,
            hasNextPage: true,
          },
        }),
      });

      await client.listCharges({ skip: 20, limit: 10 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('skip=20');
      expect(callUrl).toContain('limit=10');
    });

    it('should return PaginatedResult<Charge> with items array', async () => {
      const chargeItems: Charge[] = [
        {
          id: 'charge-1',
          amount: 5000,
          description: 'First charge',
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
          updatedAt: new Date('2025-02-12T10:00:00Z'),
        },
        {
          id: 'charge-2',
          amount: 10000,
          description: 'Second charge',
          status: 'PENDING',
          createdAt: new Date('2025-02-12T11:00:00Z'),
          updatedAt: new Date('2025-02-12T11:00:00Z'),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: chargeItems,
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 2,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listCharges();

      expect(result.items).toEqual(chargeItems);
      expect(result.items).toHaveLength(2);
    });

    it('should return pageInfo with skip, limit, totalCount, hasNextPage', async () => {
      const expectedPageInfo: PageInfo = {
        skip: 10,
        limit: 10,
        totalCount: 50,
        hasNextPage: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: expectedPageInfo,
        }),
      });

      const result = await client.listCharges({ skip: 10, limit: 10 });

      expect(result.pageInfo).toEqual(expectedPageInfo);
      expect(result.pageInfo.skip).toBe(10);
      expect(result.pageInfo.limit).toBe(10);
      expect(result.pageInfo.totalCount).toBe(50);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should handle empty results with correct pageInfo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listCharges();

      expect(result.items).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.totalCount).toBe(0);
    });
  });
});
