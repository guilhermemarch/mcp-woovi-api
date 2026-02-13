import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

export function registerDailySummaryPrompt(mcpServer: McpServer) {
  mcpServer.registerPrompt(
    'daily_summary',
    {
      title: 'Daily Account Summary',
      description: 'Generate a comprehensive daily summary of account activity including balance and recent transactions',
    },
    async (_args: any): Promise<GetPromptResult> => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Fetch the current account balance using the get_balance tool, then list the last 10 transactions using the list_transactions tool with limit=10. Summarize the account activity for today, highlighting any significant changes or patterns.`,
            },
          },
        ],
      };
    }
  );
}
