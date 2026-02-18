import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WooviClient } from '@woovi/client';
import { registerBalanceResource, registerDocsResource, registerWebhooksResource } from './index.js';

describe('Resource Registration', () => {
  let mockClient: WooviClient;
  let mockServer: any;
  let registeredResources: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    registeredResources = [];
    mockServer = {
      registerResource: vi.fn((name, uri, config, handler) => {
        registeredResources.push({ name, uri, ...config, handler });
      }),
    };
    mockClient = new WooviClient('test-app-id');
  });

  describe('Balance Resource', () => {
    it('should register balance resource with correct URI and metadata', () => {
      registerBalanceResource(mockServer, mockClient);

      const balanceResource = registeredResources.find(r => r.name === 'balance');
      expect(balanceResource).toBeDefined();
      expect(balanceResource.uri).toBe('woovi://balance/current');
      expect(balanceResource.title).toBe('Account Balance');
      expect(balanceResource.mimeType).toBe('application/json');
      expect(balanceResource.description).toContain('60 seconds');
    });

    it('should call wooviClient.getBalance() when resource is read', async () => {
      const mockGetBalance = vi.fn().mockResolvedValue({
        balance: 100000,
        totalAmount: 250000,
      });
      mockClient.getBalance = mockGetBalance;

      registerBalanceResource(mockServer, mockClient);

      const balanceResource = registeredResources.find(r => r.name === 'balance');
      const mockUri = { href: 'woovi://balance/current' };
      const result = await balanceResource.handler(mockUri);

      expect(mockGetBalance).toHaveBeenCalledTimes(1);
      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('woovi://balance/current');
      expect(result.contents[0].mimeType).toBe('application/json');
      
      const data = JSON.parse(result.contents[0].text);
      expect(data.balance).toBe(100000);
      expect(data.totalAmount).toBe(250000);
    });

    it('should return error content when getBalance() fails', async () => {
      const mockGetBalance = vi.fn().mockRejectedValue(new Error('API Error'));
      mockClient.getBalance = mockGetBalance;

      registerBalanceResource(mockServer, mockClient);

      const balanceResource = registeredResources.find(r => r.name === 'balance');
      const mockUri = { href: 'woovi://balance/current' };
      const result = await balanceResource.handler(mockUri);

      expect(result.contents[0].mimeType).toBe('application/json');
      const data = JSON.parse(result.contents[0].text);
      expect(data.error).toBe('API Error');
    });

    it('should return JSON with proper structure', async () => {
      mockClient.getBalance = vi.fn().mockResolvedValue({
        balance: 50000,
        totalAmount: 120000,
      });

      registerBalanceResource(mockServer, mockClient);

      const balanceResource = registeredResources.find(r => r.name === 'balance');
      const mockUri = { href: 'woovi://balance/current' };
      const result = await balanceResource.handler(mockUri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('woovi://balance/current');
      expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
    });
  });

  describe('Docs Resource', () => {
    it('should register endpoints resource with correct URI and metadata', () => {
      registerDocsResource(mockServer);

      const docsResource = registeredResources.find(r => r.name === 'endpoints');
      expect(docsResource).toBeDefined();
      expect(docsResource.uri).toBe('woovi://docs/endpoints');
      expect(docsResource.title).toBe('Woovi API Endpoints');
      expect(docsResource.mimeType).toBe('text/markdown');
      expect(docsResource.description).toContain('documentation');
    });

    it('should return markdown documentation when resource is read', async () => {
      registerDocsResource(mockServer);

      const docsResource = registeredResources.find(r => r.name === 'endpoints');
      const mockUri = { href: 'woovi://docs/endpoints' };
      const result = await docsResource.handler(mockUri);

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('woovi://docs/endpoints');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# Woovi API Endpoints');
    });

    it('should include all required endpoints in documentation', async () => {
      registerDocsResource(mockServer);

      const docsResource = registeredResources.find(r => r.name === 'endpoints');
      const mockUri = { href: 'woovi://docs/endpoints' };
      const result = await docsResource.handler(mockUri);

      const text = result.contents[0].text;
      expect(text).toContain('/api/v1/charge');
      expect(text).toContain('/api/v1/charge/');
      expect(text).toContain('/api/v1/customer');
      expect(text).toContain('/api/v1/transaction/');
      expect(text).toContain('/api/v1/account/');
      expect(text).toContain('/api/v1/refund/');
    });

    it('should format documentation as markdown table', async () => {
      registerDocsResource(mockServer);

      const docsResource = registeredResources.find(r => r.name === 'endpoints');
      const mockUri = { href: 'woovi://docs/endpoints' };
      const result = await docsResource.handler(mockUri);

      const text = result.contents[0].text;
      expect(text).toContain('| Method | Endpoint | Description |');
      expect(text).toContain('POST');
      expect(text).toContain('GET');
    });
  });

  describe('Webhooks Resource', () => {
    it('should register webhook_schemas resource with correct URI and metadata', () => {
      registerWebhooksResource(mockServer);

      const webhooksResource = registeredResources.find(r => r.name === 'webhook_schemas');
      expect(webhooksResource).toBeDefined();
      expect(webhooksResource.uri).toBe('woovi://webhook-schemas');
      expect(webhooksResource.title).toBe('Woovi Webhook Schemas');
      expect(webhooksResource.mimeType).toBe('application/json');
      expect(webhooksResource.description).toContain('OPENPIX:CHARGE_CREATED');
    });

    it('should return JSON schema when resource is read', async () => {
      registerWebhooksResource(mockServer);

      const webhooksResource = registeredResources.find(r => r.name === 'webhook_schemas');
      const mockUri = { href: 'woovi://webhook-schemas' };
      const result = await webhooksResource.handler(mockUri);

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('woovi://webhook-schemas');
      expect(result.contents[0].mimeType).toBe('application/json');
      
      const schema = JSON.parse(result.contents[0].text);
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });

    it('should include all required webhook event types in schema', async () => {
      registerWebhooksResource(mockServer);

      const webhooksResource = registeredResources.find(r => r.name === 'webhook_schemas');
      const mockUri = { href: 'woovi://webhook-schemas' };
      const result = await webhooksResource.handler(mockUri);

      const schema = JSON.parse(result.contents[0].text);
      const eventEnum = schema.properties.event.enum;
      
      expect(eventEnum).toContain('OPENPIX:CHARGE_CREATED');
      expect(eventEnum).toContain('OPENPIX:CHARGE_COMPLETED');
      expect(eventEnum).toContain('OPENPIX:CHARGE_EXPIRED');
      expect(eventEnum).toContain('OPENPIX:TRANSACTION_RECEIVED');
      expect(eventEnum).toContain('OPENPIX:TRANSACTION_REFUND_RECEIVED');
      expect(eventEnum).toContain('OPENPIX:MOVEMENT_CONFIRMED');
      expect(eventEnum).toHaveLength(6);
    });

    it('should define proper JSON Schema structure with required fields', async () => {
      registerWebhooksResource(mockServer);

      const webhooksResource = registeredResources.find(r => r.name === 'webhook_schemas');
      const mockUri = { href: 'woovi://webhook-schemas' };
      const result = await webhooksResource.handler(mockUri);

      const schema = JSON.parse(result.contents[0].text);
      expect(schema.type).toBe('object');
      expect(schema.properties.event).toBeDefined();
      expect(schema.properties.data).toBeDefined();
      expect(schema.required).toEqual(['event', 'data']);
    });

    it('should include example webhook payloads in schema', async () => {
      registerWebhooksResource(mockServer);

      const webhooksResource = registeredResources.find(r => r.name === 'webhook_schemas');
      const mockUri = { href: 'woovi://webhook-schemas' };
      const result = await webhooksResource.handler(mockUri);

      const schema = JSON.parse(result.contents[0].text);
      expect(schema.examples).toBeDefined();
      expect(schema.examples.length).toBeGreaterThan(0);
      expect(schema.examples[0].event).toBe('OPENPIX:CHARGE_COMPLETED');
    });
  });

  describe('Registration Integration', () => {
    it('should register all three resources without conflicts', () => {
      registerBalanceResource(mockServer, mockClient);
      registerDocsResource(mockServer);
      registerWebhooksResource(mockServer);

      expect(registeredResources).toHaveLength(3);
      expect(registeredResources.map(r => r.name)).toEqual([
        'balance',
        'endpoints',
        'webhook_schemas'
      ]);
    });

    it('should register resources with unique URIs', () => {
      registerBalanceResource(mockServer, mockClient);
      registerDocsResource(mockServer);
      registerWebhooksResource(mockServer);

      const uris = registeredResources.map(r => r.uri);
      const uniqueUris = new Set(uris);
      expect(uniqueUris.size).toBe(3);
    });

    it('should call registerResource method with correct number of arguments', () => {
      registerBalanceResource(mockServer, mockClient);
      registerDocsResource(mockServer);
      registerWebhooksResource(mockServer);

      expect(mockServer.registerResource).toHaveBeenCalledTimes(3);
      
      const calls = mockServer.registerResource.mock.calls;
      calls.forEach((call: any[]) => {
        expect(call).toHaveLength(4);
        expect(typeof call[0]).toBe('string');
        expect(typeof call[1]).toBe('string');
        expect(typeof call[2]).toBe('object');
        expect(typeof call[3]).toBe('function');
      });
    });
  });
});
