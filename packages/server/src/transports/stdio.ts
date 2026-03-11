import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfiguredServer } from '../server.js';

export async function startStdioServer() {
  const runtime = getConfiguredServer();
  const transport = new StdioServerTransport();
  await runtime.mcpServer.connect(transport);

  runtime.logger.info('Connected to MCP server via stdio');
}
