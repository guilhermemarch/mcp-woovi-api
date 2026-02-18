import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDailySummaryPrompt } from './daily-summary.js';
import { registerCustomerReportPrompt } from './customer-report.js';
import { registerReconciliationCheckPrompt } from './reconciliation-check.js';

describe('MCP Prompts Registration', () => {
  let mcpServer: McpServer;

  beforeEach(() => {
    mcpServer = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { prompts: {} } }
    );
  });

  describe('daily_summary prompt', () => {
    it('should register daily_summary prompt', () => {
      registerDailySummaryPrompt(mcpServer);
      // If registration fails, it throws
      expect(true).toBe(true);
    });

    it('should have correct metadata for daily_summary', () => {
      const spy = vi.spyOn(mcpServer, 'registerPrompt');
      registerDailySummaryPrompt(mcpServer);
      
      expect(spy).toHaveBeenCalledWith(
        'daily_summary',
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
        }),
        expect.any(Function)
      );
    });

    it('should return message array with role and content for daily_summary', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'daily_summary') handler = fn;
        return {} as any;
      });
      
      registerDailySummaryPrompt(mcpServer);
      const result = await handler({});
      
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages[0]).toHaveProperty('role');
      expect(result.messages[0]).toHaveProperty('content');
      expect(result.messages[0].content).toHaveProperty('type', 'text');
      expect(result.messages[0].content).toHaveProperty('text');
    });

    it('should include instructions to fetch balance and transactions for daily_summary', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'daily_summary') handler = fn;
        return {} as any;
      });
      
      registerDailySummaryPrompt(mcpServer);
      const result = await handler({});
      
      const text = result.messages[0].content.text.toLowerCase();
      expect(text).toContain('balance');
      expect(text).toContain('transaction');
    });

    it('should have argsSchema with date field for daily_summary', () => {
      const spy = vi.spyOn(mcpServer, 'registerPrompt');
      registerDailySummaryPrompt(mcpServer);
      
      expect(spy).toHaveBeenCalledWith(
        'daily_summary',
        expect.objectContaining({
          argsSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should reference get_transactions (not list_transactions) in daily_summary prompt', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'daily_summary') handler = fn;
        return {} as any;
      });
      
      registerDailySummaryPrompt(mcpServer);
      const result = await handler({});
      
      const text = result.messages[0].content.text;
      expect(text).toContain('get_transactions');
      expect(text).not.toContain('list_transactions');
    });
  });

  describe('customer_report prompt', () => {
    it('should register customer_report prompt', () => {
      registerCustomerReportPrompt(mcpServer);
      expect(true).toBe(true);
    });

    it('should have correct metadata with argsSchema for customer_report', () => {
      const spy = vi.spyOn(mcpServer, 'registerPrompt');
      registerCustomerReportPrompt(mcpServer);
      
      expect(spy).toHaveBeenCalledWith(
        'customer_report',
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          argsSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should accept customer_id argument for customer_report', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'customer_report') handler = fn;
        return {} as any;
      });
      
      registerCustomerReportPrompt(mcpServer);
      const result = await handler({ customer_id: 'cust_123' });
      
      expect(result).toHaveProperty('messages');
      expect(result.messages[0].content.text).toContain('cust_123');
    });

    it('should return message array with role and content for customer_report', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'customer_report') handler = fn;
        return {} as any;
      });
      
      registerCustomerReportPrompt(mcpServer);
      const result = await handler({ customer_id: 'test_customer' });
      
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages[0]).toHaveProperty('role', 'user');
      expect(result.messages[0]).toHaveProperty('content');
      expect(result.messages[0].content).toHaveProperty('type', 'text');
    });

    it('should include instructions to fetch customer and charges for customer_report', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'customer_report') handler = fn;
        return {} as any;
      });
      
      registerCustomerReportPrompt(mcpServer);
      const result = await handler({ customer_id: 'cust_456' });
      
      const text = result.messages[0].content.text.toLowerCase();
      expect(text).toContain('customer');
      expect(text).toContain('charge');
    });
  });

  describe('reconciliation_check prompt', () => {
    it('should register reconciliation_check prompt', () => {
      registerReconciliationCheckPrompt(mcpServer);
      expect(true).toBe(true);
    });

    it('should have correct metadata for reconciliation_check', () => {
      const spy = vi.spyOn(mcpServer, 'registerPrompt');
      registerReconciliationCheckPrompt(mcpServer);
      
      expect(spy).toHaveBeenCalledWith(
        'reconciliation_check',
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          argsSchema: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should return message array with role and content for reconciliation_check', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'reconciliation_check') handler = fn;
        return {} as any;
      });
      
      registerReconciliationCheckPrompt(mcpServer);
      const result = await handler({});
      
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages[0]).toHaveProperty('role', 'user');
      expect(result.messages[0]).toHaveProperty('content');
      expect(result.messages[0].content).toHaveProperty('type', 'text');
    });

    it('should include instructions to fetch transactions and charges for reconciliation_check', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'reconciliation_check') handler = fn;
        return {} as any;
      });
      
      registerReconciliationCheckPrompt(mcpServer);
      const result = await handler({});
      
      const text = result.messages[0].content.text.toLowerCase();
      expect(text).toContain('transaction');
      expect(text).toContain('charge');
      expect(text).toContain('reconcil');
    });

    it('should reference get_transactions (not list_transactions) in reconciliation_check prompt', async () => {
      let handler: any;
      vi.spyOn(mcpServer, 'registerPrompt').mockImplementation((name, _config, fn) => {
        if (name === 'reconciliation_check') handler = fn;
        return {} as any;
      });
      
      registerReconciliationCheckPrompt(mcpServer);
      const result = await handler({});
      
      const text = result.messages[0].content.text;
      expect(text).toContain('get_transactions');
      expect(text).not.toContain('list_transactions');
    });
  });

  describe('Integration tests', () => {
    it('should register all three prompts without conflicts', () => {
      registerDailySummaryPrompt(mcpServer);
      registerCustomerReportPrompt(mcpServer);
      registerReconciliationCheckPrompt(mcpServer);
      
      expect(true).toBe(true);
    });
  });
});
