import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from './client';
import type { Transaction, Balance, RefundInput, Refund, PaginatedResult, PageInfo } from './types';

describe('WooviClient Transaction Methods', () => {
  let client: WooviClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new WooviClient('test-app-id');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('listTransactions', () => {
    it('should GET from /api/v1/transaction/ endpoint', async () => {
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

      await client.listTransactions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/transaction/'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should use offset pagination with skip and limit parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 5,
            limit: 20,
            totalCount: 100,
            hasNextPage: true,
          },
        }),
      });

      await client.listTransactions({ skip: 5, limit: 20 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('skip=5');
      expect(callUrl).toContain('limit=20');
    });

    it('should return PaginatedResult<Transaction> with items and pageInfo', async () => {
      const transactionItems: Transaction[] = [
        {
          id: 'txn-1',
          chargeId: 'charge-1',
          amount: 5000,
          type: 'DEBIT',
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
        },
        {
          id: 'txn-2',
          chargeId: 'charge-2',
          amount: 10000,
          type: 'CREDIT',
          status: 'PENDING',
          createdAt: new Date('2025-02-12T11:00:00Z'),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: transactionItems,
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 2,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listTransactions();

      expect(result.items).toEqual(transactionItems);
      expect(result.pageInfo.skip).toBe(0);
      expect(result.pageInfo.limit).toBe(10);
      expect(result.pageInfo.totalCount).toBe(2);
    });

    it('should include optional start and end date filters when provided', async () => {
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

      const startDate = new Date('2025-02-01');
      const endDate = new Date('2025-02-12');

      await client.listTransactions({ startDate, endDate });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('startDate');
      expect(callUrl).toContain('endDate');
    });
  });

  describe('getBalance', () => {
    it('should GET from /api/v1/account/ endpoint when no accountId provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 80000,
            pending: 20000,
          },
        }),
      });

      await client.getBalance();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openpix.com.br/api/v1/account/',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should GET from /api/v1/account/${accountId} endpoint when accountId provided', async () => {
      const accountId = 'account-123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 80000,
            pending: 20000,
          },
        }),
      });

      await client.getBalance(accountId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/account/${accountId}`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return Balance object with available and pending fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 100000,
            pending: 50000,
          },
        }),
      });

      const result = await client.getBalance();

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('pending');
      expect(result.available).toBe(100000);
      expect(result.pending).toBe(50000);
    });

    it('should cache balance for 60 seconds (cache hit - no second fetch)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 80000,
            pending: 20000,
          },
        }),
      });

      // First call - should hit API
      await client.getBalance();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call within 60s - should use cache (no new fetch)
      await client.getBalance();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 call (cache hit)
    });

    it('should refetch balance after 60s cache expiry (cache miss)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 80000,
            pending: 20000,
          },
        }),
      });

      // First call - should hit API
      await client.getBalance();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 61 seconds (past 60s TTL)
      vi.advanceTimersByTime(61000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          balance: {
            available: 90000,
            pending: 10000,
          },
        }),
      });

      // Second call after cache expiry - should refetch from API
      await client.getBalance();
      expect(mockFetch).toHaveBeenCalledTimes(2); // New API call made
    });
  });

  describe('createRefund', () => {
    it('should POST to /api/v1/charge/${chargeId}/refund endpoint (charge-scoped)', async () => {
      const chargeId = 'charge-123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'refund-1',
          chargeId: chargeId,
          amount: 5000,
          status: 'PENDING',
          createdAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      const refundInput: RefundInput = {
        chargeId: chargeId,
        amount: 5000,
        reason: 'Customer request',
      };

      await client.createRefund(chargeId, refundInput);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/charge/${chargeId}/refund`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send RefundInput body with amount and reason', async () => {
      const chargeId = 'charge-456';
      const refundInput: RefundInput = {
        chargeId: chargeId,
        amount: 10000,
        reason: 'Duplicate payment',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'refund-2',
          chargeId: chargeId,
          amount: 10000,
          status: 'COMPLETED',
          reason: 'Duplicate payment',
          createdAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      await client.createRefund(chargeId, refundInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(refundInput),
        })
      );
    });
  });

  describe('getRefund', () => {
    it('should GET from /api/v1/refund/${refundId} endpoint', async () => {
      const refundId = 'refund-abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: refundId,
          chargeId: 'charge-1',
          amount: 5000,
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      await client.getRefund(refundId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/refund/${refundId}`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should URL-encode refundId with special characters', async () => {
      const refundIdWithSpecialChars = 'refund abc/123';
      const encodedId = encodeURIComponent(refundIdWithSpecialChars);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: refundIdWithSpecialChars,
          chargeId: 'charge-1',
          amount: 5000,
          status: 'COMPLETED',
          createdAt: new Date('2025-02-12T10:00:00Z'),
        }),
      });

      await client.getRefund(refundIdWithSpecialChars);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.openpix.com.br/api/v1/refund/${encodedId}`,
        expect.any(Object)
      );
    });
  });
});
