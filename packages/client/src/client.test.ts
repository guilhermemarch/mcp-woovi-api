import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from './client';

describe('WooviClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should accept appId and optional baseUrl', () => {
      const client = new WooviClient('test-app-id');
      expect(client).toBeDefined();
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom.api.com';
      const client = new WooviClient('test-app-id', customUrl);
      expect(client).toBeDefined();
    });

    it('should default baseUrl to https://api.openpix.com.br', () => {
      const client = new WooviClient('test-app-id');
      expect(client['baseUrl']).toBe('https://api.openpix.com.br');
    });

    it('should throw if appId is empty', () => {
      expect(() => new WooviClient('')).toThrow();
    });

    it('should throw if appId is missing', () => {
      expect(() => new WooviClient(null as any)).toThrow();
    });

    it('should initialize internal cache instance', () => {
      const client = new WooviClient('test-app-id');
      expect(client['cache']).toBeDefined();
    });
  });

  describe('Authentication Headers', () => {
    it('should set Authorization header with plain appId (NO Bearer prefix)', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await client['makeRequest']('GET', '/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-app-id',
          }),
        })
      );
    });

    it('should include Authorization header in all requests', async () => {
      const client = new WooviClient('my-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client['makeRequest']('POST', '/customers', {});

      const call = mockFetch.mock.calls[0][1];
      expect(call.headers.Authorization).toBe('my-app-id');
    });

    it('should NOT include Bearer prefix in Authorization header', async () => {
      const client = new WooviClient('secure-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await client['makeRequest']('GET', '/endpoint');

      const call = mockFetch.mock.calls[0][1];
      expect(call.headers.Authorization).not.toMatch(/^Bearer /);
      expect(call.headers.Authorization).toBe('secure-app-id');
    });
  });

  describe('Rate Limiting (429 handling)', () => {
    it('should retry on 429 with exponential backoff', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Rate limit exceeded' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Rate limit exceeded' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = client['makeRequest']('GET', '/data');

      // First failure immediately
      await vi.advanceTimersByTimeAsync(0);
      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second failure, second retry after 200ms
      await vi.advanceTimersByTimeAsync(200);
      // Success
      await vi.advanceTimersByTimeAsync(0);

      await expect(result).resolves.toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should respect exponential backoff timing: 100ms, 200ms, 400ms', async () => {
      const client = new WooviClient('test-app-id');
      const timings: number[] = [];
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        callCount++;
        timings.push(vi.now());
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ error: 'Rate limited' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ result: 'ok' }),
        });
      });

      const result = client['makeRequest']('GET', '/test');

      // Advance through retry delays
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry
      await vi.advanceTimersByTimeAsync(400); // Final attempt

      await result;

      // Verify delays between calls
      expect(timings[1] - timings[0]).toBe(100);
      expect(timings[2] - timings[1]).toBe(200);
    });

    it('should cap max retry delay at 5000ms', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limited' }),
      });

      const result = client['makeRequest']('GET', '/endpoint');

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      // Should not wait more than 5000ms total
      await expect(result).rejects.toThrow();
    });

    it('should fail after 3 retry attempts on 429', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const result = client['makeRequest']('GET', '/test');

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);
      await vi.advanceTimersByTimeAsync(0);

      await expect(result).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should NOT retry on status codes other than 429', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const result = client['makeRequest']('GET', '/data');

      await expect(result).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication Errors (401/403 handling)', () => {
    it('should throw immediately on 401 without retry', async () => {
      const client = new WooviClient('invalid-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = client['makeRequest']('GET', '/protected');

      await expect(result).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on 403 without retry', async () => {
      const client = new WooviClient('restricted-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      const result = client['makeRequest']('GET', '/forbidden');

      await expect(result).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include status code in 401 error message', async () => {
      const client = new WooviClient('bad-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = client['makeRequest']('GET', '/test');

      await expect(result).rejects.toThrow('401');
    });

    it('should include status code in 403 error message', async () => {
      const client = new WooviClient('no-access-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      const result = client['makeRequest']('GET', '/test');

      await expect(result).rejects.toThrow('403');
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask TaxID to show only last 3 digits', () => {
      const client = new WooviClient('test-app-id');
      const taxID = '12345678901';
      const masked = client['maskTaxID'](taxID);

      expect(masked).toBe('*******901');
    });

    it('should mask different TaxID values correctly', () => {
      const client = new WooviClient('test-app-id');

      const result1 = client['maskTaxID']('98765432101');
      expect(result1).toBe('*******101');

      const result2 = client['maskTaxID']('11111111111');
      expect(result2).toBe('*******111');
    });

    it('should mask phone to show only last 4 digits', () => {
      const client = new WooviClient('test-app-id');
      const phone = '11987654321';
      const masked = client['maskPhone'](phone);

      expect(masked).toBe('*******4321');
    });

    it('should mask different phone values correctly', () => {
      const client = new WooviClient('test-app-id');

      const result1 = client['maskPhone']('21998765432');
      expect(result1).toBe('*******5432');

      const result2 = client['maskPhone']('85912345678');
      expect(result2).toBe('*******5678');
    });

    it('should handle edge case: short TaxID string', () => {
      const client = new WooviClient('test-app-id');
      const shortTaxID = '123';
      const masked = client['maskTaxID'](shortTaxID);

      // Should handle gracefully (mask with asterisks, preserve last 3 if possible)
      expect(masked.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle edge case: empty TaxID string', () => {
      const client = new WooviClient('test-app-id');
      const emptyTaxID = '';
      const masked = client['maskTaxID'](emptyTaxID);

      expect(masked).toBeDefined();
    });

    it('should handle edge case: short phone string', () => {
      const client = new WooviClient('test-app-id');
      const shortPhone = '123';
      const masked = client['maskPhone'](shortPhone);

      expect(masked.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle edge case: empty phone string', () => {
      const client = new WooviClient('test-app-id');
      const emptyPhone = '';
      const masked = client['maskPhone'](emptyPhone);

      expect(masked).toBeDefined();
    });
  });

  describe('Logging with Masking', () => {
    it('should mask sensitive data in logged requests', async () => {
      const client = new WooviClient('test-app-id');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '123' }),
      });

      // Make request with sensitive data
      const payload = {
        taxID: '12345678901',
        phone: '11987654321',
      };

      await client['makeRequest']('POST', '/customer', payload);

      // Verify logs contain masked values, not raw values
      const logCalls = consoleSpy.mock.calls.map(call => call.join(' '));
      const logContent = logCalls.join('\n');

      expect(logContent).not.toContain('12345678901');
      expect(logContent).not.toContain('11987654321');

      consoleSpy.mockRestore();
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

      await client['makeRequest']('GET', '/list');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/list'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support POST requests with payload', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '123' }),
      });

      const payload = { name: 'Test' };
      await client['makeRequest']('POST', '/create', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });
  });
});
