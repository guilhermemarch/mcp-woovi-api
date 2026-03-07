import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from '../../src/client';

describe('WooviClient - Account Methods', () => {
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

  describe('listAccounts', () => {
    it('should GET from /api/v1/account/ endpoint', async () => {
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
                blocked: 1000,
                available: 99000,
              },
            },
          ],
        }),
      });

      await client.listAccounts();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/account/',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return accounts array from API payload', async () => {
      const accounts = [
        {
          accountId: 'acc_default',
          isDefault: true,
          balance: {
            total: 100000,
            blocked: 1000,
            available: 99000,
          },
        },
        {
          accountId: 'acc_secondary',
          isDefault: false,
          balance: {
            total: 50000,
            blocked: 2000,
            available: 48000,
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accounts }),
      });

      const result = await client.listAccounts();

      expect(result).toEqual(accounts);
      expect(result).toHaveLength(2);
      expect(result[0].accountId).toBe('acc_default');
    });
  });
});
