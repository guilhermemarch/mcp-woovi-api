#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Logger } from '@woovi/client';
import { mcpServer } from './server.js';
import { randomUUID } from 'crypto';

const logger = new Logger('HttpTransport', 'info');

const app = express();
app.use(express.json());

// Create transport with stateful session management
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

transport.onclose = () => {
  logger.info('Connection closed');
};
transport.onerror = (error) => {
  logger.error('Transport error', { error: String(error) });
};

// MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    logger.error('Request error', { error: String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize server with transport
async function main() {
  try {
    await mcpServer.connect(transport as any);
    logger.info('Server connected to transport');

    const port = process.env['PORT'] || 3000;
    app.listen(port, () => {
      logger.info('Listening', { port: Number(port) });
    });
  } catch (error) {
    logger.error('Fatal error', { error: String(error) });
    process.exit(1);
  }
}

main();
