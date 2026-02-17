import { SimpleCache } from './cache.js';
import { Logger } from './logger.js';
import type { ChargeInput, Charge, CustomerInput, Customer, PaginatedResult, Transaction, Balance, RefundInput, Refund } from './types.js';

export interface WooviClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
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
    const baseDelays = [100, 200, 400];

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

          // 429: retry with exponential backoff
          if (response.status === 429 && attempt < maxRetries) {
            const delay = baseDelays[attempt] ?? 5000;
            this.logger.warn('Rate limited (429), retrying', { attempt: attempt + 1, delayMs: delay, path });
            await this.sleep(delay);
            attempt++;
            continue;
          }

          // Other errors: throw immediately
          throw new Error(`Request failed with status ${response.status}`);
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

  // @ts-ignore - accessed via string key in tests
  private maskTaxID(value: string): string {
    if (value.length <= 3) {
      return value;
    }

    const visiblePart = value.slice(-3);
    return '*'.repeat(7) + visiblePart;
  }

  // @ts-ignore - accessed via string key in tests
  private maskPhone(value: string): string {
    if (value.length <= 4) {
      return value;
    }

    const visiblePart = value.slice(-4);
    return '*'.repeat(7) + visiblePart;
  }

  async createCharge(data: ChargeInput): Promise<Charge> {
    return await this.makeRequest('POST', '/api/v1/charge', data);
  }

  async getCharge(correlationID: string): Promise<Charge> {
    const encodedID = encodeURIComponent(correlationID);
    return await this.makeRequest('GET', `/api/v1/charge/${encodedID}`);
  }

  async listCharges(filters?: { skip?: number; limit?: number; status?: string }): Promise<PaginatedResult<Charge>> {
    const skip = filters?.skip ?? 0;
    const limit = filters?.limit ?? 10;
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (filters?.status) {
      params.set('status', filters.status);
    }

    const response = await this.makeRequest('GET', `/api/v1/charge/?${params.toString()}`);

    return {
      items: response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
        hasNextPage: response.hasNextPage || false,
      },
    };
  }

  async createCustomer(data: CustomerInput): Promise<Customer> {
    return await this.makeRequest('POST', '/api/v1/customer', data);
  }

  async getCustomer(idOrEmail: string): Promise<Customer> {
    if (idOrEmail.includes('@')) {
      // Email query
      const email = encodeURIComponent(idOrEmail);
      return await this.makeRequest('GET', `/api/v1/customer/?email=${email}`);
    } else {
      // ID path param
      const id = encodeURIComponent(idOrEmail);
      return await this.makeRequest('GET', `/api/v1/customer/${id}`);
    }
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

    const response = await this.makeRequest('GET', `/api/v1/customer/?${params.toString()}`);

    return {
      items: response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
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

    if (filters?.startDate) {
      params.set('startDate', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      params.set('endDate', filters.endDate.toISOString());
    }

    const response = await this.makeRequest('GET', `/api/v1/transaction/?${params.toString()}`);

    return {
      items: response.items || [],
      pageInfo: response.pageInfo || {
        skip,
        limit,
        totalCount: response.totalCount || 0,
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

    // Extract balance from response
    const balance = response.balance;

    // Cache for 60 seconds
    this.cache.set(cacheKey, balance, 60000);

    return balance;
  }

  async createRefund(data: RefundInput): Promise<Refund> {
    return await this.makeRequest('POST', '/api/v1/refund', data);
  }

  async getRefund(refundId: string): Promise<Refund> {
    const encodedId = encodeURIComponent(refundId);
    return await this.makeRequest('GET', `/api/v1/refund/${encodedId}`);
  }
}
