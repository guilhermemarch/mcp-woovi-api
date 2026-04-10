import { describe, expect, it } from 'vitest';
import {
  createJsonResourceContents,
  createJsonResourceHandler,
  createMarkdownResourceContents,
} from '../../../src/utils/resource-handler.js';

describe('resource-handler', () => {
  it('should serialize JSON resource payloads', () => {
    const result = createJsonResourceContents('woovi://balance/current', { balance: 1000 });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');
    expect(result.contents[0].text).toContain('"balance": 1000');
  });

  it('should mask sensitive values in JSON resource payloads', () => {
    const result = createJsonResourceContents('woovi://customer/1', { taxID: '12345678901' });

    expect(result.contents[0].text).toContain('*******8901');
  });

  it('should serialize markdown resource payloads', () => {
    const result = createMarkdownResourceContents('woovi://docs/endpoints', '# Docs');

    expect(result.contents[0]).toEqual({
      uri: 'woovi://docs/endpoints',
      mimeType: 'text/markdown',
      text: '# Docs',
    });
  });

  it('should convert thrown errors into JSON error payloads', async () => {
    const handler = createJsonResourceHandler(async () => {
      throw new Error('boom');
    });

    const result = await handler({ href: 'woovi://balance/current' });

    expect(result.contents[0].text).toContain('"error": "boom"');
  });
});
