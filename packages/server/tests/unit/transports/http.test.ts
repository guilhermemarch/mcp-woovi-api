import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createWooviMcpServer } from '../../../src/server.js';
import {
  createAuthMiddleware,
  createHttpApp,
  normalizeWebhookEventPayload,
  sanitizeSseEventName,
  startHttpServer,
} from '../../../src/transports/http.js';

function createRuntime(overrides?: Partial<ReturnType<typeof baseConfig>>) {
  return createWooviMcpServer({
    config: {
      ...baseConfig(),
      ...overrides,
    },
  });
}

function baseConfig() {
  return {
    appId: 'test-app-id',
    baseUrl: 'https://api.woovi-sandbox.com',
    port: 3000,
    logLevel: 'error' as const,
    authMode: 'raw' as const,
    serverName: 'woovi-mcp-server',
    serverVersion: '1.0.0',
    httpAuthToken: 'mcp-http-token',
  };
}

function createResponseMock() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response as Response & { statusCode: number; body: unknown };
}

function listRoutePaths(app: ReturnType<typeof createHttpApp>['app']) {
  return ((app as any)._router?.stack ?? [])
    .filter((layer: any) => layer.route?.path)
    .map((layer: any) => String(layer.route.path));
}

describe('createHttpApp security', () => {
  it('should refuse to create the HTTP transport without MCP auth token', () => {
    const runtime = createRuntime({ httpAuthToken: undefined });

    expect(() => createHttpApp(runtime)).toThrow('MCP_HTTP_AUTH_TOKEN');
  });

  it('should return 401 from auth middleware without bearer token', () => {
    const next = vi.fn() as NextFunction;
    const response = createResponseMock();
    const middleware = createAuthMiddleware({ warn: vi.fn() } as any, 'mcp-http-token');

    middleware(
      {
        path: '/mcp',
        method: 'POST',
        header: vi.fn().mockReturnValue(undefined),
      } as unknown as Request,
      response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should allow auth middleware to continue for valid bearer token', () => {
    const next = vi.fn() as NextFunction;
    const response = createResponseMock();
    const middleware = createAuthMiddleware({ warn: vi.fn() } as any, 'mcp-http-token');

    middleware(
      {
        path: '/mcp',
        method: 'POST',
        header: vi.fn().mockReturnValue('Bearer mcp-http-token'),
      } as unknown as Request,
      response,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
  });

  it('should not expose webhook ingress when no webhook token is configured', () => {
    const runtime = createRuntime({ webhookIngressToken: undefined });
    const { app } = createHttpApp(runtime);
    expect(listRoutePaths(app)).not.toContain('/webhooks/events');
  });

  it('should expose webhook ingress when webhook token is configured', () => {
    const runtime = createRuntime({ webhookIngressToken: 'webhook-token' });
    const { app } = createHttpApp(runtime);
    expect(listRoutePaths(app)).toContain('/webhooks/events');
  });

  it('should return 401 from webhook auth middleware without bearer token', () => {
    const next = vi.fn() as NextFunction;
    const response = createResponseMock();
    const middleware = createAuthMiddleware({ warn: vi.fn() } as any, 'webhook-token');

    middleware(
      {
        path: '/webhooks/events',
        method: 'POST',
        header: vi.fn().mockReturnValue(undefined),
      } as unknown as Request,
      response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should sanitize SSE event names before they are written to the stream', () => {
    expect(sanitizeSseEventName('OPENPIX:CHARGE_COMPLETED')).toBe('OPENPIX:CHARGE_COMPLETED');
    expect(sanitizeSseEventName('bad\nevent')).toBe('woovi');
    expect(sanitizeSseEventName('')).toBe('woovi');
  });

  it('should normalize webhook payloads by requiring an event and masking pii', () => {
    const payload = normalizeWebhookEventPayload({
      event: 'OPENPIX:CHARGE_COMPLETED',
      data: {
        payer: {
          taxID: '12345678900',
          phone: '11999999999',
        },
      },
    });

    expect(payload.event).toBe('OPENPIX:CHARGE_COMPLETED');
    expect((payload.data as any).payer.taxID).toContain('*');
    expect((payload.data as any).payer.phone).toContain('*');
  });

  it('should reject startHttpServer when the HTTP listener cannot bind', async () => {
    const runtime = createRuntime({ port: 1 });

    await expect(startHttpServer(runtime)).rejects.toThrow(/EPERM|EACCES|listen/i);
  });
});
