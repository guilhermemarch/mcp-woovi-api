import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from '../../src/client';
import type { Transaction, Balance, RefundInput, Refund, PaginatedResult, PageInfo } from '../../src/types';

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
          transactions: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
          hasPreviousPage: false,
          hasNextPage: false,
          },
        }),
      });

      await client.listTransactions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/transaction'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should use offset pagination with skip and limit parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [],
          pageInfo: {
            skip: 5,
            limit: 20,
            totalCount: 100,
          hasPreviousPage: true,
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
          value: 5000,
          type: 'PAYMENT',
          status: 'CREATED',
          createdAt: '2026-02-12T10:00:00Z',
        },
        {
          value: 10000,
          type: 'REFUND',
          status: 'REFUNDED',
          createdAt: '2026-02-11T00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          transactions: transactionItems,
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 2,
          hasPreviousPage: false,
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
          transactions: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
          hasPreviousPage: false,
          hasNextPage: false,
          },
        }),
      });

      const startDate = new Date('2025-02-01');
      const endDate = new Date('2025-02-12');

      await client.listTransactions({ startDate, endDate });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('start');
      expect(callUrl).toContain('end');
    });

    it('should include documented charge, pixQrCode, and withdrawal filters when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });

      await client.listTransactions({
        charge: 'charge-123',
        pixQrCode: 'pix-static-123',
        withdrawal: 'withdrawal-123',
      } as any);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('charge=charge-123');
      expect(callUrl).toContain('pixQrCode=pix-static-123');
      expect(callUrl).toContain('withdrawal=withdrawal-123');
    });
  });

  describe('getBalance', () => {
    it('should GET from /api/v1/account/ endpoint when no accountId provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accounts: [
            {
              accountId: 'acc_default',
              isDefault: true,
              balance: {
                total: 100000,
                blocked: 20000,
                available: 80000,
              },
            },
          ],
        }),
      });

      await client.getBalance();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/account/',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should GET from /api/v1/account/${accountId} endpoint when accountId provided', async () => {
      const accountId = 'account-123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          account: {
            accountId: 'account-123',
            isDefault: false,
            balance: {
              total: 100000,
              blocked: 20000,
              available: 80000,
            },
          },
        }),
      });

      await client.getBalance(accountId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/account/${accountId}`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return an account summary with nested balance fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accounts: [
            {
              accountId: 'acc_default',
              isDefault: true,
              officialName: 'Conta Principal',
              accountName: 'Conta de Teste',
              balance: {
                total: 150000,
                blocked: 50000,
                available: 100000,
              },
            },
          ],
        }),
      });

      const result = await client.getBalance();

      expect(result).toHaveProperty('accountId', 'acc_default');
      expect(result).toHaveProperty('officialName', 'Conta Principal');
      expect(result).toHaveProperty('accountName', 'Conta de Teste');
      expect(result).toHaveProperty('balance');
      expect(result.balance.total).toBe(150000);
      expect(result.balance.blocked).toBe(50000);
      expect(result.balance.available).toBe(100000);
    });

    it('should bypass cached balance when requested explicitly', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accounts: [
              {
                accountId: 'acc_default',
                isDefault: true,
                balance: {
                  total: 100000,
                  blocked: 20000,
                  available: 80000,
                },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accounts: [
              {
                accountId: 'acc_default',
                isDefault: true,
                balance: {
                  total: 120000,
                  blocked: 10000,
                  available: 110000,
                },
              },
            ],
          }),
        });

      const first = await client.getBalance();
      const second = await client.getBalance(undefined, { bypassCache: true });

      expect(first.balance.total).toBe(100000);
      expect(second.balance.total).toBe(120000);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should cache balance for 60 seconds (cache hit - no second fetch)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accounts: [
            {
              accountId: 'acc_default',
              isDefault: true,
              balance: {
                total: 100000,
                blocked: 20000,
                available: 80000,
              },
            },
          ],
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
          accounts: [
            {
              accountId: 'acc_default',
              isDefault: true,
              balance: {
                total: 100000,
                blocked: 20000,
                available: 80000,
              },
            },
          ],
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
          accounts: [
            {
              accountId: 'acc_default',
              isDefault: true,
              balance: {
                total: 110000,
                blocked: 10000,
                available: 100000,
              },
            },
          ],
        }),
      });

      // Second call after cache expiry - should refetch from API
      await client.getBalance();
      expect(mockFetch).toHaveBeenCalledTimes(2); // New API call made
    });
  });

  describe('createRefund', () => {
    it('should POST to /api/v1/refund endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          refund: {
            refundId: 'refund-id-1',
            correlationID: 'refund-corr-1',
            value: 5000,
            status: 'IN_PROCESSING',
            time: '2026-02-12T10:00:00Z',
          },
        }),
      });

      const refundInput: RefundInput = {
        correlationID: 'refund-corr-1',
        value: 5000,
        transactionEndToEndId: 'txn-end-to-end-1',
        comment: 'Customer request',
      };

      await client.createRefund(refundInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/refund',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send RefundInput body with correlationID, value, and comment', async () => {
      const refundInput: RefundInput = {
        correlationID: 'refund-corr-2',
        value: 10000,
        transactionEndToEndId: 'txn-end-to-end-2',
        comment: 'Duplicate payment',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          refund: {
            refundId: 'refund-id-2',
            correlationID: 'refund-corr-2',
            value: 10000,
            status: 'CONFIRMED',
            comment: 'Duplicate payment',
            time: '2026-02-12T10:00:00Z',
          },
        }),
      });

      await client.createRefund(refundInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(refundInput),
        })
      );
    });

    it('should send comment when creating a charge refund', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          refund: {
            refundId: 'refund-id-2',
            correlationID: 'refund-corr-2',
            value: 5000,
            status: 'IN_PROCESSING',
            comment: 'Charge refund comment',
            time: '2026-02-12T10:00:00Z',
          },
        }),
      });

      await client.createChargeRefund('charge-123', {
        correlationID: 'refund-corr-2',
        value: 5000,
        comment: 'Charge refund comment',
      } as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/charge/charge-123/refund',
        expect.objectContaining({
          body: JSON.stringify({
            correlationID: 'refund-corr-2',
            value: 5000,
            comment: 'Charge refund comment',
          }),
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
          refund: {
            refundId: refundId,
            correlationID: refundId,
            value: 5000,
            status: 'COMPLETED',
            time: '2026-02-12T10:00:00Z',
          },
        }),
      });

      await client.getRefund(refundId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/refund/${refundId}`,
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
          refund: {
            refundId: refundIdWithSpecialChars,
            correlationID: refundIdWithSpecialChars,
            value: 5000,
            status: 'COMPLETED',
            time: '2026-02-12T10:00:00Z',
          },
        }),
      });

      await client.getRefund(refundIdWithSpecialChars);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/refund/${encodedId}`,
        expect.any(Object)
      );
    });
  });
});
