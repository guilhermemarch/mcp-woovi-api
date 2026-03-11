import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { WooviApiError } from '@woovi/client';
import { maskSensitiveData } from './masking.js';

type ErrorCategory = 'VALIDATION_ERROR' | 'API_ERROR' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT_ERROR';

interface ErrorPayload extends Record<string, unknown> {
  ok: false;
  error: {
    message: string;
    category: ErrorCategory;
    retryable: boolean;
    statusCode?: number;
    toolName?: string;
  };
}

interface SuccessOptions<TStructured extends Record<string, unknown> = Record<string, unknown>> {
  structuredContent?: TStructured;
}

function inferErrorCategory(error: unknown): {
  category: ErrorCategory;
  retryable: boolean;
  statusCode?: number;
  message: string;
} {
  if (error instanceof WooviApiError) {
    if (error.statusCode === 404) {
      return { category: 'NOT_FOUND', retryable: false, statusCode: error.statusCode, message: error.message };
    }

    if (error.statusCode === 429) {
      return { category: 'RATE_LIMIT_ERROR', retryable: true, statusCode: error.statusCode, message: error.message };
    }

    if (error.statusCode >= 500) {
      return { category: 'NETWORK_ERROR', retryable: true, statusCode: error.statusCode, message: error.message };
    }

    return { category: 'API_ERROR', retryable: false, statusCode: error.statusCode, message: error.message };
  }

  if (error instanceof Error && /validation|invalid|required|zod/i.test(error.message)) {
    return { category: 'VALIDATION_ERROR', retryable: false, message: error.message };
  }

  if (error instanceof Error && /timed out|network|fetch failed|abort/i.test(error.message)) {
    return { category: 'NETWORK_ERROR', retryable: true, message: error.message };
  }

  if (error instanceof Error) {
    return { category: 'API_ERROR', retryable: false, message: error.message };
  }

  return { category: 'API_ERROR', retryable: false, message: String(error) };
}

export function formatToolSuccess<TResult, TStructured extends Record<string, unknown> = Record<string, unknown>>(
  result: TResult,
  options?: SuccessOptions<TStructured>,
): CallToolResult {
  const masked = maskSensitiveData(result);

  return {
    ...(options?.structuredContent !== undefined ? { structuredContent: options.structuredContent } : {}),
    content: [{ type: 'text', text: JSON.stringify(masked, null, 2) || '{}' }],
  };
}

export function formatToolError(error: unknown, toolName?: string): CallToolResult & { structuredContent: ErrorPayload } {
  const inferred = inferErrorCategory(error);
  const payload: ErrorPayload = {
    ok: false,
    error: {
      message: inferred.message,
      category: inferred.category,
      retryable: inferred.retryable,
      ...(inferred.statusCode !== undefined ? { statusCode: inferred.statusCode } : {}),
      ...(toolName ? { toolName } : {}),
    },
  };

  return {
    structuredContent: payload,
    content: [{ type: 'text', text: `Error: ${inferred.message}` }],
    isError: true,
  };
}

export function createJsonToolHandler<TInput, TResult>(
  toolName: string,
  implementation: (args: TInput) => Promise<TResult>,
  options?: SuccessOptions,
) {
  return async (args: TInput): Promise<CallToolResult> => {
    try {
      const result = await implementation(args);
      return formatToolSuccess(result, options);
    } catch (error) {
      return formatToolError(error, toolName);
    }
  };
}

export type { ErrorCategory, ErrorPayload, SuccessOptions };
