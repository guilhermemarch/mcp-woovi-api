import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfiguredServer } from '../server.js';

interface StartStdioServerOptions {
  runtime?: ReturnType<typeof getConfiguredServer>;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
}

export async function startStdioServer(options: StartStdioServerOptions = {}) {
  const runtime = options.runtime ?? getConfiguredServer();
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const transport = new StdioServerTransport(stdin, stdout);
  await runtime.mcpServer.connect(transport);

  runtime.logger.info('Connected to MCP server via stdio');

  stdin.resume();

  await new Promise<void>((resolve) => {
    const settle = () => {
      stdin.off('end', settle);
      stdin.off('close', settle);
      resolve();
    };

    stdin.once('end', settle);
    stdin.once('close', settle);
  });
}
