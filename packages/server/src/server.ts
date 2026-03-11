import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, WooviClient } from '@woovi/client';
import type { ServerConfig } from './core/config.js';
import { loadServerConfig } from './core/config.js';
import { WebhookEventBus } from './core/event-bus.js';
import { registerMcpCapabilities } from './mcp/register.js';

export interface WooviMcpRuntime {
  config: ServerConfig;
  logger: Logger;
  wooviClient: WooviClient;
  mcpServer: McpServer;
  eventBus: WebhookEventBus;
}

export interface CreateWooviMcpServerOptions {
  config: ServerConfig;
  logger?: Logger;
  wooviClient?: WooviClient;
  eventBus?: WebhookEventBus;
}

export function createWooviMcpServer(options: CreateWooviMcpServerOptions): WooviMcpRuntime {
  const logger = options.logger ?? new Logger('McpServer', options.config.logLevel);
  const wooviClient = options.wooviClient ?? new WooviClient(options.config.appId, {
    baseUrl: options.config.baseUrl,
    authMode: options.config.authMode,
    logLevel: options.config.logLevel,
  });
  const eventBus = options.eventBus ?? new WebhookEventBus();

  const mcpServer = new McpServer({
    name: options.config.serverName,
    version: options.config.serverVersion,
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  });

  registerMcpCapabilities(mcpServer, wooviClient);

  logger.info('MCP server initialized', {
    tools: 13,
    resources: 3,
    resourceTemplates: 2,
    prompts: 3,
    baseUrl: options.config.baseUrl,
    authMode: options.config.authMode,
  });

  return {
    config: options.config,
    logger,
    wooviClient,
    mcpServer,
    eventBus,
  };
}

let runtimeSingleton: WooviMcpRuntime | null = null;

export function getConfiguredServer(env: NodeJS.ProcessEnv = process.env): WooviMcpRuntime {
  if (!runtimeSingleton) {
    runtimeSingleton = createWooviMcpServer({
      config: loadServerConfig(env),
    });
  }

  return runtimeSingleton;
}
