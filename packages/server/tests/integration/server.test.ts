import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WooviClient } from '@woovi/client';
import { registerMcpCapabilities } from '../../src/mcp/register.js';

describe('MCP Server Integration Tests', () => {
  let client: Client;
  let server: McpServer;
  let mockWooviClient: WooviClient;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    server = new McpServer({
      name: 'woovi-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    });

    mockWooviClient = new WooviClient('test-app-id');

    registerMcpCapabilities(server, mockWooviClient);

    await server.connect(serverTransport);

    client = new Client({
      name: 'test-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  describe('tools/list', () => {
    it('should return core and bonus tools', async () => {
      const response = await client.listTools();
      expect(response.tools).toBeDefined();
      expect(response.tools.length).toBe(13);
    });
  
    it('should include charge tools', async () => {
      const response = await client.listTools();
      const chargeTools = response.tools.filter(t =>
        ['create_charge', 'get_charge', 'list_charges'].includes(t.name)
      );
      expect(chargeTools.length).toBe(3);
    });
  
    it('should include customer tools', async () => {
      const response = await client.listTools();
      const customerTools = response.tools.filter(t =>
        ['create_customer', 'get_customer', 'list_customers'].includes(t.name)
      );
      expect(customerTools.length).toBe(3);
    });
  
    it('should include transaction tools', async () => {
      const response = await client.listTools();
      const transactionTools = response.tools.filter(t =>
        t.name === 'get_transactions' || t.name === 'get_balance'
      );
      expect(transactionTools.length).toBe(2);
    });
  
    it('should include refund tools', async () => {
      const response = await client.listTools();
      const refundTools = response.tools.filter(t => t.name.includes('refund'));
      expect(refundTools.length).toBe(2);
    });

    it('should include account and analytics bonus tools', async () => {
      const response = await client.listTools();
      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toContain('list_accounts');
      expect(toolNames).toContain('get_charge_analytics');
      expect(toolNames).toContain('get_customer_payment_summary');
    });
  });

  describe('resources/list', () => {
    it('should return exactly 3 resources', async () => {
      const response = await client.listResources();
      expect(response.resources).toBeDefined();
      expect(response.resources.length).toBe(3);
    });

    it('should include balance resource', async () => {
      const response = await client.listResources();
      const balanceResource = response.resources.find(r => r.name === 'balance');
      expect(balanceResource).toBeDefined();
    });

    it('should include docs (endpoints) resource', async () => {
      const response = await client.listResources();
      const docsResource = response.resources.find(r => r.name === 'endpoints');
      expect(docsResource).toBeDefined();
    });

    it('should include webhooks resource', async () => {
      const response = await client.listResources();
      const webhooksResource = response.resources.find(r => r.name === 'webhook_schemas');
      expect(webhooksResource).toBeDefined();
    });
  });

  describe('resource templates/list', () => {
    it('should expose dynamic resource templates', async () => {
      const response = await client.listResourceTemplates();
      expect(response.resourceTemplates.length).toBeGreaterThanOrEqual(2);
      expect(response.resourceTemplates.some(r => r.name === 'account_balance')).toBe(true);
      expect(response.resourceTemplates.some(r => r.name === 'endpoint_docs')).toBe(true);
    });
  });

  describe('prompts/list', () => {
    it('should return exactly 3 prompts', async () => {
      const response = await client.listPrompts();
      expect(response.prompts).toBeDefined();
      expect(response.prompts.length).toBe(3);
    });

    it('should include daily_summary prompt', async () => {
      const response = await client.listPrompts();
      const dailyPrompt = response.prompts.find(p => p.name === 'daily_summary');
      expect(dailyPrompt).toBeDefined();
    });

    it('should include customer_report prompt', async () => {
      const response = await client.listPrompts();
      const reportPrompt = response.prompts.find(p => p.name === 'customer_report');
      expect(reportPrompt).toBeDefined();
    });

    it('should include reconciliation_check prompt', async () => {
      const response = await client.listPrompts();
      const reconcilePrompt = response.prompts.find(p => p.name === 'reconciliation_check');
      expect(reconcilePrompt).toBeDefined();
    });
  });

  describe('tool call', () => {
    it('should call create_charge tool successfully with mocked WooviClient', async () => {
      const mockCreateCharge = vi.fn().mockResolvedValue({
        value: 5000,
        correlationID: 'test-correlation-123',
        identifier: 'id-1',
        transactionID: 'tx-1',
        status: 'ACTIVE',
        brCode: '00020126360014br.gov.bcb.brcode',
        qrCodeImage: 'data:image/png;base64,iVBORw0KGgo=',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-1',
        createdAt: '2026-02-12T00:00:00Z',
        updatedAt: '2026-02-12T00:00:00Z',
      });

      mockWooviClient.createCharge = mockCreateCharge;

      const response = await client.callTool({
        name: 'create_charge',
        arguments: {
          value: 5000,
          correlationID: 'test-correlation-123',
          customer: { name: 'Test Customer', email: 'test@example.com' },
        },
      });

      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('00020126360014br.gov.bcb.brcode');
      expect(mockCreateCharge).toHaveBeenCalled();
    });
  });

  describe('resource read', () => {
    it('should read balance resource successfully with mocked WooviClient', async () => {
      const mockGetBalance = vi.fn().mockResolvedValue({
        total: 100000,
        blocked: 5000,
        available: 95000,
      });

      mockWooviClient.getBalance = mockGetBalance;

      const response = await client.readResource({
        uri: 'woovi://balance/current',
      });

      expect(response.contents).toBeDefined();
      expect(Array.isArray(response.contents)).toBe(true);
      expect(response.contents[0].mimeType).toBe('application/json');

      const content = response.contents[0];
      if ('text' in content) {
        const data = JSON.parse(content.text);
        expect(data.total).toBe(100000);
      }
      expect(mockGetBalance).toHaveBeenCalled();
    });
  });

  describe('prompt call', () => {
    it('should call daily_summary prompt successfully', async () => {
      const response = await client.getPrompt({
        name: 'daily_summary',
        arguments: {},
      });

      expect(response.messages).toBeDefined();
      expect(Array.isArray(response.messages)).toBe(true);
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.messages[0]).toHaveProperty('role');
      expect(response.messages[0]).toHaveProperty('content');

      const messageContent = response.messages[0].content;
      if ('type' in messageContent && messageContent.type === 'text' && 'text' in messageContent) {
        expect(messageContent.text).toBeTruthy();
      }
    });
  });
});
