import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

interface ToolMetadata {
  description: string;
  annotations?: ToolAnnotations;
}

interface PromptMetadata {
  title: string;
  description: string;
}

type PromptArgsSchema = Record<string, z.ZodTypeAny>;

export function registerZodTool<TInputSchema extends z.ZodTypeAny>(
  mcpServer: McpServer,
  name: string,
  config: ToolMetadata & {
    inputSchema: TInputSchema;
    outputSchema?: z.ZodTypeAny;
  },
  handler: (args: z.infer<TInputSchema>) => Promise<CallToolResult> | CallToolResult,
) {
  const { inputSchema, outputSchema, ...metadata } = config;

  return mcpServer.registerTool(
    name,
    {
      ...metadata,
      inputSchema: inputSchema as any,
      ...(outputSchema ? { outputSchema: outputSchema as any } : {}),
    },
    handler as any,
  );
}

export function registerZodPrompt<TArgsSchema extends PromptArgsSchema>(
  mcpServer: McpServer,
  name: string,
  config: PromptMetadata & {
    argsSchema: TArgsSchema;
  },
  handler: (args: Partial<{ [K in keyof TArgsSchema]: z.infer<TArgsSchema[K]> }>) => Promise<GetPromptResult> | GetPromptResult,
) {
  const { argsSchema, ...metadata } = config;

  return mcpServer.registerPrompt(
    name,
    {
      ...metadata,
      argsSchema: argsSchema as any,
    },
    handler as any,
  );
}
