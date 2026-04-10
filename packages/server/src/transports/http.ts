import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Logger } from '@woovi/client';
import type { ServerConfig } from '../core/config.js';
import type { WooviMcpRuntime } from '../server.js';
import { getConfiguredServer } from '../server.js';
import { maskSensitiveData } from '../utils/masking.js';

export interface HttpAppRuntime {
  app: Express;
  transport: StreamableHTTPServerTransport;
  logger: Logger;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_SSE_EVENT_NAME = 'woovi';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeSseEventName(eventName: string): string {
  const normalized = eventName.trim();

  if (!normalized || /[\r\n]/.test(normalized) || !/^[A-Za-z0-9:_-]+$/.test(normalized)) {
    return DEFAULT_SSE_EVENT_NAME;
  }

  return normalized;
}

export function normalizeWebhookEventPayload(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new Error('Webhook payload must be a JSON object');
  }

  const rawEvent = payload['event'];
  if (typeof rawEvent !== 'string' || rawEvent.trim() === '') {
    throw new Error('Webhook payload must include a non-empty event');
  }

  const maskedPayload = maskSensitiveData(payload);
  const normalizedPayload = isRecord(maskedPayload) ? maskedPayload : {};

  return {
    ...normalizedPayload,
    event: sanitizeSseEventName(rawEvent),
    receivedAt: typeof payload['receivedAt'] === 'string' && payload['receivedAt'].trim() !== ''
      ? payload['receivedAt']
      : new Date().toISOString(),
  };
}

export function assertHttpSecurityConfig(config: ServerConfig): void {
  if (!config.httpAuthToken) {
    throw new Error('MCP_HTTP_AUTH_TOKEN is required when using the HTTP transport');
  }
}

function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export function isAuthorized(req: Request, expectedToken?: string): boolean {
  if (!expectedToken) {
    return true;
  }

  const authHeader = req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader;
  return bearerToken === expectedToken;
}

export function createAuthMiddleware(logger: Pick<Logger, 'warn'>, expectedToken?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isAuthorized(req, expectedToken)) {
      next();
      return;
    }

    logger.warn('Rejected unauthorized HTTP request', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({ error: 'Unauthorized' });
  };
}

export function createHttpApp(runtime: WooviMcpRuntime): HttpAppRuntime {
  assertHttpSecurityConfig(runtime.config);
  const logger = new Logger('HttpTransport', runtime.config.logLevel);
  const app = express();
  const auth = createAuthMiddleware(logger, runtime.config.httpAuthToken);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  app.disable('x-powered-by');
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '1mb' }));

  transport.onclose = () => {
    logger.info('Connection closed');
  };
  transport.onerror = (error) => {
    logger.error('Transport error', { error: String(error) });
  };

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: runtime.config.serverName,
      version: runtime.config.serverVersion,
    });
  });

  app.get('/events', auth, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: ready\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    const unsubscribe = runtime.eventBus.subscribe((event) => {
      const eventName = sanitizeSseEventName(typeof event['event'] === 'string' ? event['event'] : '');
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  });

  if (runtime.config.webhookIngressToken) {
    const webhookAuth = createAuthMiddleware(logger, runtime.config.webhookIngressToken);
    app.post('/webhooks/events', webhookAuth, (req: Request, res: Response) => {
      try {
        const payload = normalizeWebhookEventPayload(req.body);
        runtime.eventBus.publish(payload);
        res.status(202).json({ status: 'accepted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Rejected invalid webhook payload', { error: message });
        res.status(400).json({ error: message });
      }
    });
  } else {
    logger.warn('Webhook ingress route disabled because WOOVI_WEBHOOK_INGRESS_TOKEN is not configured');
  }

  app.post('/mcp', auth, async (req: Request, res: Response) => {
    try {
      await transport.handleRequest(req as any, res as any, req.body);
    } catch (error) {
      logger.error('Request error', { error: String(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { app, transport, logger };
}

export async function startHttpServer(runtime: WooviMcpRuntime = getConfiguredServer()) {
  const { app, transport, logger } = createHttpApp(runtime);
  await runtime.mcpServer.connect(transport as any);
  logger.info('Server connected to HTTP transport');

  return await new Promise<{ close: () => Promise<void> }>((resolve, reject) => {
    const server = app.listen(runtime.config.port);

    server.once('error', (error) => {
      logger.error('Failed to start HTTP listener', {
        port: runtime.config.port,
        error: String(error),
      });
      void runtime.mcpServer.close().catch((closeError) => {
        logger.error('Failed to close MCP server after HTTP startup error', {
          error: String(closeError),
        });
      });
      reject(error);
    });

    server.once('listening', () => {
      logger.info('Listening', { port: runtime.config.port });
      resolve({
        close: async () => {
          await new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          });
        },
      });
    });
  });
}
