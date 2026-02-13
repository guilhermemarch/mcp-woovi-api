#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpServer } from './server.js';
async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('[Stdio Transport] Connected to MCP server');
}
main().catch((error) => {
    console.error('[Stdio Transport] Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=stdio.js.map