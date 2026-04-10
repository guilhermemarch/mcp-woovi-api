import { describe, expect, it } from 'vitest';
import { createJsonToolHandler, formatToolError, formatToolSuccess } from '../../../src/utils/tool-handler.js';

function getTextContent(result: { content: Array<{ type: string } & Record<string, unknown>> }) {
  const first = result.content[0];
  expect(first).toBeDefined();
  expect(first!.type).toBe('text');
  return String(first!['text']);
}

describe('tool-handler', () => {
  it('should format success payloads as JSON text', () => {
    const result = formatToolSuccess({ ok: true, value: 123 });

    expect(getTextContent(result as any)).toContain('"ok": true');
  });

  it('should include structured content when requested', () => {
    const result = formatToolSuccess(
      { ok: true, taxID: '12345678901' },
      { structuredContent: { ok: true, taxID: '12345678901' } },
    );

    expect(result.structuredContent).toEqual({ ok: true, taxID: '*******8901' });
  });

  it('should format errors with category metadata', () => {
    const result = formatToolError(new Error('boom'));

    expect(result.isError).toBe(true);
    expect(getTextContent(result as any)).toContain('Error: boom');
    expect(result.structuredContent).toMatchObject({
      ok: false,
      error: {
        category: 'API_ERROR',
      },
    });
  });

  it('should wrap async implementations consistently', async () => {
    const handler = createJsonToolHandler('sample_tool', async () => ({
      taxID: '12345678901',
    }));

    const result = await handler({});
    expect(getTextContent(result as any)).toContain('*******8901');
  });
});
