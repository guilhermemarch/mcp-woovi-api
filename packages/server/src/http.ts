#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpServer } from './server.js';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

// Create transport with stateful session management
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

transport.onclose = () => {
  console.error('[HTTP Transport] Connection closed');
};
transport.onerror = (error) => {
  console.error('[HTTP Transport] Transport error:', error);
};

// MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('[HTTP Transport] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize server with transport
async function main() {
  try {
    await mcpServer.connect(transport as any);
    console.error('[HTTP Transport] Server connected to transport');

    const port = process.env['PORT'] || 3000;
    app.listen(port, () => {
      console.error(`[HTTP Transport] Listening on port ${port}`);
    });
  } catch (error) {
    console.error('[HTTP Transport] Fatal error:', error);
    process.exit(1);
  }
}

main();

