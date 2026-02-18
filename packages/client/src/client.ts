import { SimpleCache } from './cache.js';
import { Logger } from './logger.js';
import type { ChargeInput, Charge, CustomerInput, Customer, PaginatedResult, Transaction, Balance, RefundInput, Refund, ChargeRefundInput } from './types.js';

export interface WooviClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export class WooviApiError extends Error {
  statusCode: number;
  errorBody?: any;

  constructor(message: string, statusCode: number, errorBody?: any) {
    super(message);
    this.name = 'WooviApiError';
    this.statusCode = statusCode;
    this.errorBody = errorBody;
  }
}

export class WooviClient {
  private appId: string;
  private baseUrl: string;
  private timeoutMs: number;
  private logger: Logger;
  // @ts-ignore - accessed via string key in tests
  private cache: SimpleCache<string, any>;

  constructor(appId: string, configOrBaseUrl?: string | WooviClientConfig) {
    if (!appId || appId.trim() === '') {
      throw new Error('appId is required and cannot be empty');
    }

    this.appId = appId;

    if (typeof configOrBaseUrl === 'string') {
      this.baseUrl = configOrBaseUrl;
      this.timeoutMs = 30_000;
    } else {
      this.baseUrl = configOrBaseUrl?.baseUrl || 'https://api.woovi.com';
      this.timeoutMs = configOrBaseUrl?.timeoutMs ?? 30_000;
    }

    this.cache = new SimpleCache();
    this.logger = new Logger('WooviClient', 'info');
    this.logger.info('Client initialized', { baseUrl: this.baseUrl, timeoutMs: this.timeoutMs });
  }

  // @ts-ignore - accessed via string key in tests
  private async makeRequest(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug('Request started', { method, path });
    const headers: Record<string, string> = {
      Authorization: this.appId,
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    let attempt = 0;
    const maxRetries = 3;
    const baseDelays = [1000, 2000, 5000];

    try {
      while (attempt <= maxRetries) {
        try {
          const response = await fetch(url, options);

          // Success case
          if (response.ok) {
            return await response.json();
          }

          // 401/403: immediate failure, no retry
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Auth error: ${response.status}`);
          }

          // 429: retry with exponential backoff or Retry-After header
          if (response.status === 429 && attempt < maxRetries) {
            // Check for Retry-After header (in seconds)
            const retryAfterHeader = response.headers.get('Retry-After');
            const delay = retryAfterHeader 
              ? parseInt(retryAfterHeader, 10) * 1000  // Convert seconds to milliseconds
              : (baseDelays[attempt] ?? 5000);
            this.logger.warn('Rate limited (429), retrying', { attempt: attempt + 1, delayMs: delay, path, retryAfter: retryAfterHeader });
            await this.sleep(delay);
            attempt++;
            continue;
          }

          // For 429 at max retries or other errors: parse error body and throw
          let errorMessage = `Request failed with status ${response.status}`;
          let errorBody: any;

          try {
            errorBody = await response.json();

            // Format 1: { error: "string" }
            if (typeof errorBody.error === 'string') {
              errorMessage = errorBody.error;
            }
            // Format 2: { error: [{ message, code?, path? }] }
            else if (Array.isArray(errorBody.error) && errorBody.error.length > 0) {
              const messages = errorBody.error.map((e: any) => e.message || String(e)).filter(Boolean);
              if (messages.length > 0) {
                errorMessage = messages.join('; ');
              }
            }
            // Format 3: { errors: [{ message }] }
            else if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
              const messages = errorBody.errors.map((e: any) => e.message || String(e)).filter(Boolean);
              if (messages.length > 0) {
                errorMessage = messages.join('; ');
              }
            }
          } catch (parseError) {
            // Fallback: if JSON parsing fails, use status-only message
            this.logger.warn('Failed to parse error body', { parseError });
          }

          throw new WooviApiError(errorMessage, response.status, errorBody);
        } catch (error) {
          // Abort errors (timeout): throw immediately with clear message
          if (error instanceof DOMException && error.name === 'AbortError') {
            this.logger.error('Request timed out', { path, timeoutMs: this.timeoutMs });
            throw new Error(`Request timed out after ${this.timeoutMs}ms`);
          }

          // If we've exhausted retries, throw the error
          if (attempt >= maxRetries) {
            throw error;
          }

          // For non-429 errors, throw immediately
          if (error instanceof Error && !error.message.includes('429')) {
            throw error;
          }

          attempt++;
        }
      }

      throw new Error('Request failed: max retries exceeded');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createCharge(data: ChargeInput): Promise<Charge> {
    return await this.makeRequest('POST', '/api/v1/charge?return_existing=true', data);
  }

  async getCharge(correlationID: string): Promise<Charge> {
    const encodedID = encodeURIComponent(correlationID);
    return await this.makeRequest('GET', `/api/v1/charge/${encodedID}`);
  }

  async listCharges(filters?: { skip?: number; limit?: number; status?: string; startDate?: Date; endDate?: Date; customer?: string }): Promise<PaginatedResult<Charge>> {
    const skip = filters?.skip ?? 0;
    const limit = filters?.limit ?? 10;
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (filters?.status) {
      params.set('status', filters.status);
    }

    if (filters?.startDate) {
      params.set('start', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      params.set('end', filters.endDate.toISOString());
    }

    if (filters?.customer) {
      params.set('customer', filters.customer);
    }

    const response = await this.makeRequest('GET', `/api/v1/charge?${params.toString()}`);

    return {
      items: response.charges || response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
        hasPreviousPage: skip > 0,
        hasNextPage: response.hasNextPage || false,
      },
    };
  }

  async createCustomer(data: CustomerInput): Promise<Customer> {
    return await this.makeRequest('POST', '/api/v1/customer', data);
  }

  async getCustomer(idOrEmail: string): Promise<Customer> {
    const cacheKey = `customer:${idOrEmail}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let response;
    if (idOrEmail.includes('@')) {
      // Email query
      const email = encodeURIComponent(idOrEmail);
      response = await this.makeRequest('GET', `/api/v1/customer/?email=${email}`);
    } else {
      // ID path param
      const id = encodeURIComponent(idOrEmail);
      response = await this.makeRequest('GET', `/api/v1/customer/${id}`);
    }

    // Cache for 60 seconds
    this.cache.set(cacheKey, response, 60000);

    return response;
  }

  async listCustomers(filters?: { search?: string; skip?: number; limit?: number }): Promise<PaginatedResult<Customer>> {
    const skip = filters?.skip ?? 0;
    const limit = filters?.limit ?? 10;
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (filters?.search) {
      params.set('search', filters.search);
    }

    const response = await this.makeRequest('GET', `/api/v1/customer?${params.toString()}`);

    return {
      items: response.customers || response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
        hasPreviousPage: skip > 0,
        hasNextPage: response.hasNextPage || false,
      },
    };
  }

  async listTransactions(filters?: { skip?: number; limit?: number; startDate?: Date; endDate?: Date }): Promise<PaginatedResult<Transaction>> {
    const skip = filters?.skip ?? 0;
    const limit = filters?.limit ?? 10;
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    // Note: API uses 'start'/'end' params per official spec
    if (filters?.startDate) {
      params.set('start', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      params.set('end', filters.endDate.toISOString());
    }

    const response = await this.makeRequest('GET', `/api/v1/transaction?${params.toString()}`);

    return {
      items: response.transactions || response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
        hasPreviousPage: skip > 0,
        hasNextPage: response.hasNextPage || false,
      },
    };
  }

  async getBalance(accountId?: string): Promise<Balance> {
    const cacheKey = `balance:${accountId || 'default'}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Make API request
    const endpoint = accountId ? `/api/v1/account/${accountId}` : '/api/v1/account/';
    const response = await this.makeRequest('GET', endpoint);

    // Extract account from response.accounts array
    let account;
    if (accountId) {
      // Find specific account by ID
      account = response.accounts?.find((a: any) => a.accountId === accountId);
    } else {
      // Find default account or use first
      account = response.accounts?.find((a: any) => a.isDefault) || response.accounts?.[0];
    }

    if (!account || !account.balance) {
      this.logger.warn('Account or balance not found in response', { response });
      throw new Error('No account found or balance data unavailable');
    }

    const balance = account.balance;

    // Cache for 60 seconds
    this.cache.set(cacheKey, balance, 60000);

    return balance;
  }

  async createRefund(data: RefundInput): Promise<Refund> {
    const response = await this.makeRequest('POST', '/api/v1/refund', data);
    return response.refund;
  }

  async createChargeRefund(chargeID: string, data: ChargeRefundInput): Promise<any> {
    const response = await this.makeRequest('POST', `/api/v1/charge/${chargeID}/refund`, data);
    return response.refund;
  }

  async getRefund(refundId: string): Promise<Refund> {
    const encodedId = encodeURIComponent(refundId);
    const response = await this.makeRequest('GET', `/api/v1/refund/${encodedId}`);
    return response.pixTransactionRefund;
  }
}
