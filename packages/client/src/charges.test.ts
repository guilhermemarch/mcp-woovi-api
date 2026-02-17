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
    it('should POST to /api/v1/charge endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          value: 5000,
          correlationID: 'test-corr-123',
          identifier: 'id-1',
          transactionID: 'tx-1',
          status: 'ACTIVE',
          brCode: '00020126...',
          paymentLinkUrl: 'https://pay.woovi.com/...',
          qrCodeImage: 'https://api.woovi.com/qr/...',
          pixKey: 'pix-key',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-1',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      const chargeInput: ChargeInput = {
        value: 5000,
        correlationID: 'test-corr-123',
      };

      await client.createCharge(chargeInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/charge',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send ChargeInput as JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          value: 5000,
          correlationID: 'test-corr-123',
          identifier: 'id-1',
          transactionID: 'tx-1',
          status: 'ACTIVE',
          brCode: 'br-code',
          paymentLinkUrl: 'https://pay.woovi.com/...',
          qrCodeImage: 'https://api.woovi.com/qr/...',
          pixKey: 'pix-key',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-1',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      const chargeInput: ChargeInput = {
        value: 5000,
        correlationID: 'test-corr-123',
      };

      await client.createCharge(chargeInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(chargeInput),
        })
      );
    });

    it('should return Charge object with all API response fields', async () => {
      const chargeResponse = {
        value: 10000,
        correlationID: 'corr-456',
        identifier: 'id-456',
        transactionID: 'tx-456',
        status: 'ACTIVE',
        brCode: '00020126...',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-456',
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => chargeResponse,
      });

      const result = await client.createCharge({
        value: 10000,
        correlationID: 'corr-456',
      });

      expect(result).toEqual(chargeResponse);
      expect(result.value).toBe(10000); // Verify centavos
    });

    it('should handle value in centavos (integer)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          value: 50000, // R$ 500.00 in centavos
          correlationID: 'corr-789',
          identifier: 'id-789',
          transactionID: 'tx-789',
          status: 'ACTIVE',
          brCode: 'br-code',
          paymentLinkUrl: 'https://pay.woovi.com/...',
          qrCodeImage: 'https://api.woovi.com/qr/...',
          pixKey: 'pix-key',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-789',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      const result = await client.createCharge({
        value: 50000,
        correlationID: 'corr-789',
      });

      expect(result.value).toBe(50000);
      expect(Number.isInteger(result.value)).toBe(true);
    });
  });

  describe('getCharge', () => {
    it('should GET from /api/v1/charge/{correlationID} endpoint', async () => {
      const chargeId = 'charge-abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          value: 5000,
          correlationID: chargeId,
          identifier: 'id-abc',
          transactionID: 'tx-abc',
          status: 'COMPLETED',
          brCode: 'br-code',
          paymentLinkUrl: 'https://pay.woovi.com/...',
          qrCodeImage: 'https://api.woovi.com/qr/...',
          pixKey: 'pix-key',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-abc',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      await client.getCharge(chargeId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/charge/${chargeId}`,
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
          value: 5000,
          correlationID: chargeIdWithSpaces,
          identifier: 'id-enc',
          transactionID: 'tx-enc',
          status: 'COMPLETED',
          brCode: 'br-code',
          paymentLinkUrl: 'https://pay.woovi.com/...',
          qrCodeImage: 'https://api.woovi.com/qr/...',
          pixKey: 'pix-key',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-enc',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      await client.getCharge(chargeIdWithSpaces);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/charge/${encodedId}`,
        expect.any(Object)
      );
    });

    it('should return Charge object', async () => {
      const chargeResponse = {
        value: 15000,
        correlationID: 'corr-def456',
        identifier: 'id-def',
        transactionID: 'tx-def',
        status: 'COMPLETED' as const,
        brCode: 'br-code',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-def',
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => chargeResponse,
      });

      const result = await client.getCharge('corr-def456');

      expect(result).toEqual(chargeResponse);
      expect(result.correlationID).toBe('corr-def456');
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
      const chargeItems = [
        {
          value: 5000,
          correlationID: 'corr-1',
          identifier: 'id-1',
          transactionID: 'tx-1',
          status: 'COMPLETED',
          brCode: 'br-code-1',
          paymentLinkUrl: 'url-1',
          qrCodeImage: 'qr-1',
          pixKey: 'pix-1',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-1',
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        },
        {
          value: 10000,
          correlationID: 'corr-2',
          identifier: 'id-2',
          transactionID: 'tx-2',
          status: 'ACTIVE',
          brCode: 'br-code-2',
          paymentLinkUrl: 'url-2',
          qrCodeImage: 'qr-2',
          pixKey: 'pix-2',
          expiresDate: '2026-03-01T00:00:00Z',
          type: 'DYNAMIC',
          globalID: 'global-2',
          createdAt: '2026-02-12T11:00:00Z',
          updatedAt: '2026-02-12T11:00:00Z',
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
