#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from '@woovi/client';
import { mcpServer } from './server.js';

const logger = new Logger('StdioTransport', 'info');

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  logger.info('Connected to MCP server via stdio');
}

main().catch((error) => {
  logger.error('Fatal error', { error: String(error) });
  process.exit(1);
});
