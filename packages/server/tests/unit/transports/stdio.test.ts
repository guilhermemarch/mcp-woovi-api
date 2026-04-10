import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { startStdioServer } from '../../../src/transports/stdio.js';

describe('startStdioServer', () => {
  it('should keep the stdio process alive after connecting', async () => {
    const connect = vi.fn().mockResolvedValue(undefined);
    const info = vi.fn();
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    let settled = false;

    const promise = startStdioServer({
      runtime: {
        mcpServer: { connect },
        logger: { info },
      } as any,
      stdin: stdin as any,
      stdout: stdout as any,
    });
    promise.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(connect).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    stdin.end();
    await promise;
    expect(settled).toBe(true);
  });
});
