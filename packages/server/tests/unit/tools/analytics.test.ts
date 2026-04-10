import { describe, it, expect, vi } from 'vitest';
import { registerAnalyticsTools } from '../../../src/tools/analytics.js';

describe('Analytics Tools', () => {
  it('should register analytics bonus tools', () => {
    const registeredTools: any[] = [];
    const mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredTools.push({ name, ...config, handler });
      }),
    };

    registerAnalyticsTools(mockServer as any, {} as any);

    expect(registeredTools.find(t => t.name === 'get_charge_analytics')).toBeDefined();
    expect(registeredTools.find(t => t.name === 'get_customer_payment_summary')).toBeDefined();
  });

  it('should aggregate charge totals by status', async () => {
    const registeredTools: any[] = [];
    const mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredTools.push({ name, ...config, handler });
      }),
    };

    const listCharges = vi.fn().mockResolvedValue({
      items: [
        { correlationID: 'a', value: 1000, status: 'ACTIVE' },
        { correlationID: 'b', value: 2000, status: 'COMPLETED' },
        { correlationID: 'c', value: 3000, status: 'COMPLETED' },
      ],
      pageInfo: {
        skip: 0,
        limit: 10,
        totalCount: 3,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    registerAnalyticsTools(mockServer as any, { listCharges } as any);

    const tool = registeredTools.find(t => t.name === 'get_charge_analytics');
    const result = await tool.handler({ limit: 10 });
    const payload = JSON.parse(result.content[0].text);

    expect(listCharges).toHaveBeenCalled();
    expect(payload.summary.totalCharges).toBe(3);
    expect(payload.summary.totalValue).toBe(6000);
    expect(payload.summary.byStatus.COMPLETED.count).toBe(2);
  });

  it('should compose customer and charges into a payment summary', async () => {
    const registeredTools: any[] = [];
    const mockServer = {
      registerTool: vi.fn((name, config, handler) => {
        registeredTools.push({ name, ...config, handler });
      }),
    };

    const getCustomer = vi.fn().mockResolvedValue({
      correlationID: 'customer-123',
      name: 'Customer Example',
      email: 'customer@example.com',
    });

    const listCharges = vi.fn().mockResolvedValue({
      items: [
        { correlationID: 'c1', value: 1000, status: 'ACTIVE' },
        { correlationID: 'c2', value: 2500, status: 'COMPLETED' },
      ],
      pageInfo: {
        skip: 0,
        limit: 5,
        totalCount: 2,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    registerAnalyticsTools(mockServer as any, { getCustomer, listCharges } as any);

    const tool = registeredTools.find(t => t.name === 'get_customer_payment_summary');
    const result = await tool.handler({ customerId: 'customer-123', limit: 5 });
    const payload = JSON.parse(result.content[0].text);

    expect(getCustomer).toHaveBeenCalledWith('customer-123');
    expect(listCharges).toHaveBeenCalledWith(expect.objectContaining({ customer: 'customer-123' }));
    expect(payload.customer.name).toBe('Customer Example');
    expect(payload.summary.totalCharges).toBe(2);
    expect(payload.summary.completedValue).toBe(2500);
  });
});
