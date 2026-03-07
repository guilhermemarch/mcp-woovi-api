import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from '../../src/client';
import type { ChargeInput, Charge, PaginatedResult, PageInfo } from '../../src/types';

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
          charge: {
            value: 5000,
            correlationID: 'test-corr-123',
            status: 'ACTIVE',
            brCode: '00020126...',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
        }),
      });

      const chargeInput: ChargeInput = {
        value: 5000,
        correlationID: 'test-corr-123',
      };

      await client.createCharge(chargeInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/charge?return_existing=true',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send ChargeInput as JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          charge: {
            value: 5000,
            correlationID: 'test-corr-123',
            status: 'ACTIVE',
            brCode: 'br-code',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
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

    it('should include all optional fields (redirectUrl, splits, discountSettings) in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          charge: {
            value: 1000,
            correlationID: 'test-123',
            status: 'ACTIVE',
            brCode: 'br-code',
            paymentLinkUrl: 'url',
            qrCodeImage: 'qr',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T00:00:00Z',
          },
        }),
      });

      const chargeInput: ChargeInput = {
        value: 1000,
        correlationID: 'test-123',
        redirectUrl: 'https://example.com',
        ensureSameTaxID: true,
        discountSettings: { modality: 'fixed', amount: 50 },
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
        status: 'ACTIVE',
        brCode: '00020126...',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        expiresDate: '2026-03-01T00:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ charge: chargeResponse }),
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
          charge: {
            value: 50000, // R$ 500.00 in centavos
            correlationID: 'corr-789',
            status: 'ACTIVE',
            brCode: 'br-code',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
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
          charge: {
            value: 5000,
            correlationID: chargeId,
            status: 'COMPLETED',
            brCode: 'br-code',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
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
          charge: {
            value: 5000,
            correlationID: chargeIdWithSpaces,
            status: 'COMPLETED',
            brCode: 'br-code',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            expiresDate: '2026-03-01T00:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
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
        status: 'COMPLETED' as const,
        brCode: 'br-code',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        expiresDate: '2026-03-01T00:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ charge: chargeResponse }),
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
          charges: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });

      await client.listCharges();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/charge'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should use offset pagination with skip and limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          charges: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasPreviousPage: false,
            hasNextPage: false,
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
          status: 'COMPLETED',
          brCode: 'br-code-1',
          paymentLinkUrl: 'url-1',
          qrCodeImage: 'qr-1',
          expiresDate: '2026-03-01T00:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        },
        {
          value: 10000,
          correlationID: 'corr-2',
          status: 'ACTIVE',
          brCode: 'br-code-2',
          paymentLinkUrl: 'url-2',
          qrCodeImage: 'qr-2',
          expiresDate: '2026-03-01T00:00:00Z',
          updatedAt: '2026-02-12T11:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          charges: chargeItems,
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 2,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listCharges();

      expect(result.items).toEqual(chargeItems);
      expect(result.items).toHaveLength(2);
    });

    it('should return pageInfo with skip, limit, totalCount, hasPreviousPage, hasNextPage', async () => {
      const expectedPageInfo: PageInfo = {
        skip: 10,
        limit: 10,
        totalCount: 50,
        hasPreviousPage: true,
        hasNextPage: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          charges: [],
          pageInfo: expectedPageInfo,
        }),
      });

      const result = await client.listCharges({ skip: 10, limit: 10 });

      expect(result.pageInfo).toEqual(expectedPageInfo);
      expect(result.pageInfo.skip).toBe(10);
      expect(result.pageInfo.limit).toBe(10);
      expect(result.pageInfo.totalCount).toBe(50);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should handle empty results with correct pageInfo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          charges: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasPreviousPage: false,
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
