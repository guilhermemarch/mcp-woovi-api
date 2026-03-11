import type { LogLevel } from '@woovi/client';

export interface ServerConfig {
  appId: string;
  baseUrl: string;
  port: number;
  logLevel: LogLevel;
  authMode: 'raw' | 'bearer';
  httpAuthToken?: string;
  webhookIngressToken?: string;
  serverName: string;
  serverVersion: string;
}

function parseOptionalSecret(name: string, value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} cannot be empty when provided`);
  }

  return normalized;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
}

function parseLogLevel(value: string | undefined): LogLevel {
  switch (value) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return value;
    case undefined:
    case '':
      return 'info';
    default:
      throw new Error(`Invalid WOOVI_LOG_LEVEL value: ${value}`);
  }
}

function parseAuthMode(value: string | undefined): 'raw' | 'bearer' {
  switch (value) {
    case 'raw':
    case 'bearer':
      return value;
    case undefined:
    case '':
      return 'raw';
    default:
      throw new Error(`Invalid WOOVI_AUTH_MODE value: ${value}`);
  }
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const appId = env['WOOVI_APP_ID'];
  if (!appId) {
    throw new Error('WOOVI_APP_ID environment variable is required');
  }

  const config: ServerConfig = {
    appId,
    baseUrl: env['WOOVI_API_URL'] || 'https://api.woovi-sandbox.com',
    port: parsePort(env['PORT'], 3000),
    logLevel: parseLogLevel(env['WOOVI_LOG_LEVEL']),
    authMode: parseAuthMode(env['WOOVI_AUTH_MODE']),
    serverName: env['MCP_SERVER_NAME'] || 'woovi-mcp-server',
    serverVersion: env['MCP_SERVER_VERSION'] || '1.0.0',
  };

  const httpAuthToken = parseOptionalSecret('MCP_HTTP_AUTH_TOKEN', env['MCP_HTTP_AUTH_TOKEN']);
  if (httpAuthToken !== undefined) {
    config.httpAuthToken = httpAuthToken;
  }

  const webhookIngressToken = parseOptionalSecret('WOOVI_WEBHOOK_INGRESS_TOKEN', env['WOOVI_WEBHOOK_INGRESS_TOKEN']);
  if (webhookIngressToken !== undefined) {
    config.webhookIngressToken = webhookIngressToken;
  }

  return config;
}
