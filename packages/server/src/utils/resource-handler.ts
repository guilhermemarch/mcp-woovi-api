import { maskSensitiveData } from './masking.js';

interface ResourceUriLike {
  href: string;
}

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
  [key: string]: unknown;
}

interface ResourceResult {
  contents: ResourceContent[];
  [key: string]: unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createResourceContents(uri: string, mimeType: string, text: string): ResourceResult {
  return {
    contents: [{
      uri,
      mimeType,
      text,
    }],
  };
}

export function createJsonResourceContents(uri: string, data: unknown): ResourceResult {
  return createResourceContents(uri, 'application/json', JSON.stringify(maskSensitiveData(data), null, 2));
}

export function createMarkdownResourceContents(uri: string, text: string): ResourceResult {
  return createResourceContents(uri, 'text/markdown', text);
}

export function createJsonResourceHandler<TArgs extends [ResourceUriLike, ...unknown[]]>(
  implementation: (...args: TArgs) => Promise<unknown> | unknown,
) {
  return async (...args: TArgs): Promise<ResourceResult> => {
    const [uri] = args;

    try {
      const result = await implementation(...args);
      return createJsonResourceContents(uri.href, result);
    } catch (error) {
      return createJsonResourceContents(uri.href, { error: getErrorMessage(error) });
    }
  };
}

export type { ResourceContent, ResourceResult, ResourceUriLike };
