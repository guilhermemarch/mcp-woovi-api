import { SimpleCache } from './cache.js';
import { Logger } from './logger.js';
import type { ChargeInput, Charge, CustomerInput, Customer, PaginatedResult, Transaction, Balance, RefundInput, Refund, ChargeRefundInput, Account, PageInfo } from './types.js';
import type { LogLevel } from './logger.js';

export interface WooviClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  authMode?: 'raw' | 'bearer';
  logLevel?: LogLevel;
}

export class WooviApiError extends Error {
  statusCode: number;
  errorBody?: unknown;

  constructor(message: string, statusCode: number, errorBody?: unknown) {
    super(message);
    this.name = 'WooviApiError';
    this.statusCode = statusCode;
    this.errorBody = errorBody;
  }
}

interface ApiErrorItem {
  message?: string;
  [key: string]: unknown;
}

interface ApiErrorResponse {
  error?: string | ApiErrorItem[];
  errors?: ApiErrorItem[];
  [key: string]: unknown;
}

interface AccountsResponse {
  accounts?: Account[];
  pageInfo?: PageInfo;
}

interface AccountResponse {
  account?: Account;
}

interface ChargeResponse {
  charge?: Charge;
}

interface GetBalanceOptions {
  bypassCache?: boolean;
}

export class WooviClient {
  private appId: string;
  private baseUrl: string;
  private timeoutMs: number;
  private logger: Logger;
  private authMode: 'raw' | 'bearer';
  private cache: SimpleCache<string, unknown>;

  constructor(appId: string, configOrBaseUrl?: string | WooviClientConfig) {
    if (!appId || appId.trim() === '') {
      throw new Error('appId is required and cannot be empty');
    }

    this.appId = appId;
    let logLevel: LogLevel = 'info';

    if (typeof configOrBaseUrl === 'string') {
      this.baseUrl = configOrBaseUrl;
      this.timeoutMs = 30_000;
      this.authMode = 'raw';
    } else {
      this.baseUrl = configOrBaseUrl?.baseUrl || 'https://api.woovi.com';
      this.timeoutMs = configOrBaseUrl?.timeoutMs ?? 30_000;
      this.authMode = configOrBaseUrl?.authMode ?? 'raw';
      logLevel = configOrBaseUrl?.logLevel ?? 'info';
    }

    this.cache = new SimpleCache();
    this.logger = new Logger('WooviClient', logLevel);
    this.logger.info('Client initialized', { baseUrl: this.baseUrl, timeoutMs: this.timeoutMs });
  }

  private async makeRequest<TResponse = unknown>(method: string, path: string, body?: unknown): Promise<TResponse> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug('Request started', { method, path });
    const headers: Record<string, string> = {
      Authorization: this.authMode === 'bearer' ? `Bearer ${this.appId}` : this.appId,
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
            return await response.json() as TResponse;
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
          let errorBody: ApiErrorResponse | undefined;

          try {
            errorBody = await response.json() as ApiErrorResponse;

            // Format 1: { error: "string" }
            if (typeof errorBody.error === 'string') {
              errorMessage = errorBody.error;
            }
            // Format 2: { error: [{ message, code?, path? }] }
            else if (Array.isArray(errorBody.error) && errorBody.error.length > 0) {
              const messages = errorBody.error.map((entry) => entry.message || String(entry)).filter(Boolean);
              if (messages.length > 0) {
                errorMessage = messages.join('; ');
              }
            }
            // Format 3: { errors: [{ message }] }
            else if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
              const messages = errorBody.errors.map((entry) => entry.message || String(entry)).filter(Boolean);
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
    const response = await this.makeRequest<ChargeResponse & Charge>('POST', '/api/v1/charge?return_existing=true', data);
    return response.charge ?? response;
  }

  async getCharge(correlationID: string): Promise<Charge> {
    const encodedID = encodeURIComponent(correlationID);
    const response = await this.makeRequest<ChargeResponse & Charge>('GET', `/api/v1/charge/${encodedID}`);
    return response.charge ?? response;
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

    const response = await this.makeRequest<{ charges?: Charge[]; pageInfo: PageInfo }>('GET', `/api/v1/charge?${params.toString()}`);

    return {
      items: response.charges || [],
      pageInfo: {
        skip,
        limit,
        totalCount: response.pageInfo.totalCount,
        hasPreviousPage: response.pageInfo.hasPreviousPage,
        hasNextPage: response.pageInfo.hasNextPage,
      },
    };
  }

  async createCustomer(data: CustomerInput): Promise<Customer> {
    const normalizedPayload = {
      ...data,
      ...(data.taxID && {
        taxID: typeof data.taxID === 'string' ? data.taxID : data.taxID.taxID,
      }),
    };

    const response = await this.makeRequest<{ customer?: Customer } & Customer>('POST', '/api/v1/customer', normalizedPayload);
    return response.customer ?? response;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const cacheKey = `customer:${customerId}`;

    // Check cache first
    const cached = this.cache.get(cacheKey) as Customer | undefined;
    if (cached) {
      return cached;
    }

    const id = encodeURIComponent(customerId);
    const response = await this.makeRequest<{ customer?: Customer } & Customer>('GET', `/api/v1/customer/${id}`);

    // Cache for 60 seconds
    const customer = response.customer ?? response;
    this.cache.set(cacheKey, customer, 60000);

    return customer;
  }

  async listCustomers(filters?: { search?: string; skip?: number; limit?: number }): Promise<PaginatedResult<Customer>> {
    const skip = filters?.skip ?? 0;
    const limit = filters?.limit ?? 10;
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    const response = await this.makeRequest<{ customers?: Customer[]; pageInfo: PageInfo }>('GET', `/api/v1/customer?${params.toString()}`);
    const customers = response.customers || [];
    const normalizedSearch = filters?.search?.trim().toLowerCase();
    const filteredCustomers = normalizedSearch
      ? customers.filter((customer) => {
          const haystacks = [
            customer.name,
            customer.email,
            customer.phone,
            customer.correlationID,
            customer.taxID?.taxID,
          ];

          return haystacks.some((value) => value?.toLowerCase().includes(normalizedSearch));
        })
      : customers;
    const totalCount = normalizedSearch ? filteredCustomers.length : response.pageInfo.totalCount;

    return {
      items: filteredCustomers,
      pageInfo: {
        skip,
        limit,
        totalCount,
        hasPreviousPage: normalizedSearch ? false : response.pageInfo.hasPreviousPage,
        hasNextPage: normalizedSearch ? false : response.pageInfo.hasNextPage,
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

    const response = await this.makeRequest<{ transactions: Transaction[]; pageInfo: PageInfo }>('GET', `/api/v1/transaction?${params.toString()}`);

    return {
      items: response.transactions,
      pageInfo: response.pageInfo,
    };
  }

  async listAccounts(): Promise<Account[]> {
    const response = await this.makeRequest<AccountsResponse>('GET', '/api/v1/account/');
    return response.accounts ?? [];
  }

  async getBalance(accountId?: string, options?: GetBalanceOptions): Promise<Balance> {
    const cacheKey = `balance:${accountId || 'default'}`;

    if (!options?.bypassCache) {
      const cached = this.cache.get(cacheKey) as Balance | undefined;
      if (cached) {
        return cached;
      }
    }

    const endpoint = accountId ? `/api/v1/account/${accountId}` : '/api/v1/account/';
    const response = await this.makeRequest<(AccountsResponse & AccountResponse)>('GET', endpoint);

    let account;
    if (accountId) {
      account = response.account ?? response.accounts?.find((candidate) => candidate.accountId === accountId);
    } else {
      account = response.accounts?.find((candidate) => candidate.isDefault) || response.accounts?.[0];
    }

    if (!account || !account.balance) {
      this.logger.warn('Account or balance not found in response', { response });
      throw new Error('No account found or balance data unavailable');
    }

    const balance = account.balance;

    if (!options?.bypassCache) {
      this.cache.set(cacheKey, balance, 60000);
    }

    return balance;
  }

  async createRefund(data: RefundInput): Promise<Refund> {
    const response = await this.makeRequest<{ refund: Refund }>('POST', '/api/v1/refund', data);
    return response.refund;
  }

  async createChargeRefund(chargeID: string, data: ChargeRefundInput): Promise<Refund> {
    const response = await this.makeRequest<{ refund: Refund }>('POST', `/api/v1/charge/${chargeID}/refund`, data);
    return response.refund;
  }

  async getRefund(refundId: string): Promise<Refund> {
    const encodedId = encodeURIComponent(refundId);
    const response = await this.makeRequest<{ refund?: Refund; pixTransactionRefund?: Refund } & Refund>('GET', `/api/v1/refund/${encodedId}`);
    return response.refund ?? response.pixTransactionRefund ?? response;
  }
}
