import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient, WooviApiError } from './client';

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

    it('should default baseUrl to https://api.woovi.com', () => {
      const client = new WooviClient('test-app-id');
      expect(client['baseUrl']).toBe('https://api.woovi.com');
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

  describe('Rate Limiting (429 handling)', { timeout: 15000 }, () => {
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
      // First retry after 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      // Second failure, second retry after 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      // Success
      await vi.advanceTimersByTimeAsync(0);

      await expect(result).resolves.toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should respect exponential backoff timing: 1000ms, 2000ms, 5000ms', async () => {
      const client = new WooviClient('test-app-id');
      const timings: number[] = [];
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        callCount++;
        timings.push(Date.now());
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
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry
      await vi.advanceTimersByTimeAsync(5000); // Final attempt

      await result;

      // Verify delays between calls
      expect(timings[1] - timings[0]).toBe(1000);
      expect(timings[2] - timings[1]).toBe(2000);
    });

    it('should cap max retry delay at 5000ms', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limited' }),
      });

      let caughtError: Error | undefined;
      const result = client['makeRequest']('GET', '/endpoint').catch((err) => {
        caughtError = err;
      });

      // Advance through all retries and flush microtasks
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      await result;
      expect(caughtError).toBeDefined();
    });

    it('should fail after 3 retry attempts on 429', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      let caughtError: Error | undefined;
      const result = client['makeRequest']('GET', '/test').catch((err) => {
        caughtError = err;
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      await result;
      expect(caughtError).toBeDefined();
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

  describe('Logging with Masking', () => {
    it('should mask sensitive data in logged requests', async () => {
      const client = new WooviClient('test-app-id');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

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

  describe('Error Body Parsing', () => {
    it('should parse error string format: { error: "string" }', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Charge not found' }),
      });

      await expect(client['makeRequest']('GET', '/charge/123')).rejects.toThrow('Charge not found');
    });

    it('should parse error array format: { error: [{ message }] }', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: [
            { code: 'INVALID_CPF', message: 'Invalid CPF format', path: 'customer.taxID' },
            { code: 'REQUIRED_FIELD', message: 'Field "value" is required', path: 'value' }
          ]
        }),
      });

      await expect(client['makeRequest']('POST', '/charge', {}))
        .rejects.toThrow('Invalid CPF format; Field "value" is required');
    });

    it('should parse errors array format: { errors: [{ message }] }', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: [
            { message: 'Field "value" is required' },
            { message: 'Invalid email format' }
          ]
        }),
      });

      await expect(client['makeRequest']('POST', '/customer', {}))
        .rejects.toThrow('Field "value" is required; Invalid email format');
    });

    it('should fallback gracefully for non-JSON error bodies', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client['makeRequest']('GET', '/endpoint'))
        .rejects.toThrow('Request failed with status 500');
    });

    it('should throw WooviApiError with statusCode property', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      try {
        await client['makeRequest']('GET', '/test');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WooviApiError);
        expect((err as WooviApiError).statusCode).toBe(404);
      }
    });

    it('should throw WooviApiError with errorBody property', async () => {
      const client = new WooviClient('test-app-id');
      const errorBody = { error: 'Resource not found' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => errorBody,
      });

      try {
        await client['makeRequest']('GET', '/resource/123');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WooviApiError);
        expect((err as WooviApiError).errorBody).toEqual(errorBody);
      }
    });

    it('should handle error array with missing message fields', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: [
            { code: 'ERR1', message: 'First error' },
            { code: 'ERR2' }
          ]
        }),
      });

      await expect(client['makeRequest']('POST', '/test', {}))
        .rejects.toThrow('First error; [object Object]');
    });

    it('should use status-only message for empty error body', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

      await expect(client['makeRequest']('GET', '/endpoint'))
        .rejects.toThrow('Request failed with status 503');
    });

    it('should handle plain text error body (non-JSON)', async () => {
      const client = new WooviClient('test-app-id');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      try {
        await client['makeRequest']('GET', '/test');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WooviApiError);
        expect((err as WooviApiError).statusCode).toBe(502);
        expect((err as WooviApiError).message).toContain('502');
      }
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
