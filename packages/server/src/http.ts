#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { startHttpServer } from './transports/http.js';

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  startHttpServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      component: 'HttpTransport',
      message: 'Fatal error',
      error: message,
    }) + '\n');
    process.exit(1);
  });
}

export { createHttpApp, startHttpServer } from './transports/http.js';
