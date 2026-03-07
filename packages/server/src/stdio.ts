#!/usr/bin/env node
import { startStdioServer } from './transports/stdio.js';

startStdioServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    component: 'StdioTransport',
    message: 'Fatal error',
    error: message,
  }) + '\n');
  process.exit(1);
});

export { startStdioServer } from './transports/stdio.js';
