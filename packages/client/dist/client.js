import { SimpleCache } from './cache.js';
export class WooviClient {
    constructor(appId, baseUrl) {
        if (!appId || appId.trim() === '') {
            throw new Error('appId is required and cannot be empty');
        }
        this.appId = appId;
        this.baseUrl = baseUrl || 'https://api.openpix.com.br';
        this.cache = new SimpleCache();
    }
    // @ts-ignore - accessed via string key in tests
    async makeRequest(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: this.appId,
            'Content-Type': 'application/json',
        };
        const options = {
            method,
            headers,
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        let attempt = 0;
        const maxRetries = 3;
        const baseDelays = [100, 200, 400];
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
                    await this.sleep(delay);
                    attempt++;
                    continue;
                }
                // Other errors: throw immediately
                throw new Error(`Request failed with status ${response.status}`);
            }
            catch (error) {
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
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // @ts-ignore - accessed via string key in tests
    maskTaxID(value) {
        if (value.length <= 3) {
            return value;
        }
        const visiblePart = value.slice(-3);
        return '*'.repeat(7) + visiblePart;
    }
    // @ts-ignore - accessed via string key in tests
    maskPhone(value) {
        if (value.length <= 4) {
            return value;
        }
        const visiblePart = value.slice(-4);
        return '*'.repeat(7) + visiblePart;
    }
    async createCharge(data) {
        return await this.makeRequest('POST', '/api/openpix/v1/charge', data);
    }
    async getCharge(correlationID) {
        const encodedID = encodeURIComponent(correlationID);
        return await this.makeRequest('GET', `/api/v1/charge/${encodedID}`);
    }
    async listCharges(filters) {
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
    async createCustomer(data) {
        return await this.makeRequest('POST', '/api/v1/customer', data);
    }
    async getCustomer(idOrEmail) {
        if (idOrEmail.includes('@')) {
            // Email query
            const email = encodeURIComponent(idOrEmail);
            return await this.makeRequest('GET', `/api/v1/customer/?email=${email}`);
        }
        else {
            // ID path param
            const id = encodeURIComponent(idOrEmail);
            return await this.makeRequest('GET', `/api/v1/customer/${id}`);
        }
    }
    async listCustomers(filters) {
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
    async listTransactions(filters) {
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
    async getBalance(accountId) {
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
    async createRefund(chargeId, data) {
        const encodedId = encodeURIComponent(chargeId);
        return await this.makeRequest('POST', `/api/v1/charge/${encodedId}/refund`, data);
    }
    async getRefund(refundId) {
        const encodedId = encodeURIComponent(refundId);
        return await this.makeRequest('GET', `/api/v1/refund/${encodedId}`);
    }
}
//# sourceMappingURL=client.js.map