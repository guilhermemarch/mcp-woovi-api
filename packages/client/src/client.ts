import { SimpleCache } from './cache';

export class WooviClient {
  private appId: string;
  private baseUrl: string;
  // @ts-ignore - accessed via string key in tests
  private cache: SimpleCache<string, any>;

  constructor(appId: string, baseUrl?: string) {
    if (!appId || appId.trim() === '') {
      throw new Error('appId is required and cannot be empty');
    }

    this.appId = appId;
    this.baseUrl = baseUrl || 'https://api.openpix.com.br';
    this.cache = new SimpleCache();
  }

  // @ts-ignore - accessed via string key in tests
  private async makeRequest(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.appId,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
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
      } catch (error) {
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
}
