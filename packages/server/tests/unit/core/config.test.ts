import { describe, expect, it } from 'vitest';
import { loadServerConfig } from '../../../src/core/config.js';

describe('loadServerConfig', () => {
  it('should load valid HTTP and webhook auth tokens', () => {
    const config = loadServerConfig({
      WOOVI_APP_ID: 'app-id',
      MCP_HTTP_AUTH_TOKEN: 'http-secret-token',
      WOOVI_WEBHOOK_INGRESS_TOKEN: 'webhook-secret-token',
    });

    expect(config.httpAuthToken).toBe('http-secret-token');
    expect(config.webhookIngressToken).toBe('webhook-secret-token');
  });

  it('should reject blank HTTP auth tokens', () => {
    expect(() =>
      loadServerConfig({
        WOOVI_APP_ID: 'app-id',
        MCP_HTTP_AUTH_TOKEN: '   ',
      }),
    ).toThrow('MCP_HTTP_AUTH_TOKEN');
  });

  it('should reject blank webhook ingress tokens', () => {
    expect(() =>
      loadServerConfig({
        WOOVI_APP_ID: 'app-id',
        WOOVI_WEBHOOK_INGRESS_TOKEN: '   ',
      }),
    ).toThrow('WOOVI_WEBHOOK_INGRESS_TOKEN');
  });
});
