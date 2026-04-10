import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WooviClient } from '@woovi/client';
import { registerAccountTools } from '../../../src/tools/accounts.js';

describe('Account Tools', () => {
  let mockClient: WooviClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new WooviClient('test-app-id');
  });

  it('should register list_accounts tool', () => {
    const registeredTools: any[] = [];
    const mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredTools.push({ name, ...config, handler });
      }),
    };

    registerAccountTools(mockServer as any, mockClient);

    const tool = registeredTools.find(t => t.name === 'list_accounts');
    expect(tool).toBeDefined();
    expect(tool.description).toContain('accounts');
  });

  it('should call wooviClient.listAccounts and return account data', async () => {
    const registeredTools: any[] = [];
    const mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredTools.push({ name, ...config, handler });
      }),
    };

    const listAccounts = vi.fn().mockResolvedValue([
      {
        accountId: 'acc_default',
        isDefault: true,
        balance: {
          total: 100000,
          blocked: 0,
          available: 100000,
        },
      },
    ]);

    registerAccountTools(mockServer as any, { listAccounts } as any);

    const tool = registeredTools.find(t => t.name === 'list_accounts');
    const result = await tool.handler({});

    expect(listAccounts).toHaveBeenCalledWith();
    expect(result.content[0].text).toContain('acc_default');
  });
});
