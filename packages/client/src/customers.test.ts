import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WooviClient } from './client';
import type { CustomerInput, Customer, PaginatedResult, PageInfo } from './types';

describe('WooviClient - Customer Methods', () => {
  let client: WooviClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    client = new WooviClient('test-app-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should POST to /api/v1/customer endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          name: 'Test Customer',
          email: 'test@example.com',
          taxID: { taxID: '12345678901', type: 'BR:CPF' as const },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      const customerInput: CustomerInput = {
        name: 'Test Customer',
        email: 'test@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
      };

      await client.createCustomer(customerInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.woovi.com/api/v1/customer',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send CustomerInput as JSON body with name, email, and taxID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          name: 'João Silva',
          email: 'joao@example.com',
          taxID: { taxID: '12345678901', type: 'BR:CPF' as const },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      const customerInput: CustomerInput = {
        name: 'João Silva',
        email: 'joao@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
      };

      await client.createCustomer(customerInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(customerInput),
        })
      );
    });

    it('should return Customer with taxID as object (not string)', async () => {
      const customerResponse: Customer = {
        name: 'João Silva',
        email: 'joao@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => customerResponse,
      });

      const result = await client.createCustomer({
        name: 'João Silva',
        email: 'joao@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
      });

      expect(result.taxID).toEqual({ taxID: '12345678901', type: 'BR:CPF' });
      expect(typeof result.taxID).toBe('object');
      expect(result.taxID!.taxID).toBe('12345678901');
      expect(result.taxID!.type).toBe('BR:CPF');
    });

    it('should accept CNPJ tax ID type', async () => {
      const customerResponse: Customer = {
        name: 'Empresa LTDA',
        email: 'empresa@example.com',
        taxID: { taxID: '12345678000100', type: 'BR:CNPJ' },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => customerResponse,
      });

      const result = await client.createCustomer({
        name: 'Empresa LTDA',
        email: 'empresa@example.com',
        taxID: { taxID: '12345678000100', type: 'BR:CNPJ' },
      });

      expect(result.taxID!.type).toBe('BR:CNPJ');
      expect(result.taxID!.taxID).toBe('12345678000100');
    });

    it('should include all required fields in response', async () => {
      const customerResponse: Customer = {
        name: 'Test User',
        email: 'test@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => customerResponse,
      });

      const result = await client.createCustomer({
        name: 'Test User',
        email: 'test@example.com',
        taxID: { taxID: '12345678901', type: 'BR:CPF' },
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('taxID');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('getCustomer', () => {
    it('should GET from /api/v1/customer/{id} when ID provided', async () => {
      const customerId = 'cust-abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'Test Customer',
          email: 'test@example.com',
          taxID: { taxID: '12345678901', type: 'BR:CPF' as const },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      await client.getCustomer(customerId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/customer/${customerId}`,
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should query by email when email format detected', async () => {
      const email = 'joao@example.com';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'João Silva',
          email: email,
          taxID: { taxID: '12345678901', type: 'BR:CPF' as const },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      await client.getCustomer(email);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/api/v1/customer/');
      expect(callUrl).toContain(`email=${encodeURIComponent(email)}`);
    });

    it('should return Customer object with correct structure', async () => {
      const customerResponse: Customer = {
        name: 'Maria Santos',
        email: 'maria@example.com',
        taxID: { taxID: '98765432109', type: 'BR:CPF' },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => customerResponse,
      });

      const result = await client.getCustomer('cust-def456');

      expect(result).toEqual(customerResponse);
      expect(result.name).toBe('Maria Santos');
    });

    it('should handle URL-encoded customer ID with special characters', async () => {
      const customerId = 'cust-abc/123';
      const encodedId = encodeURIComponent(customerId);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'Test Customer',
          email: 'test@example.com',
          taxID: { taxID: '12345678901', type: 'BR:CPF' as const },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        }),
      });

      await client.getCustomer(customerId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.woovi.com/api/v1/customer/${encodedId}`,
        expect.any(Object)
      );
    });
  });

  describe('listCustomers', () => {
    it('should GET from /api/v1/customer/ with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      await client.listCustomers();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/customer/'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support search query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      await client.listCustomers({ search: 'João' });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('search=');
    });

    it('should support skip and limit pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 20,
            limit: 15,
            totalCount: 100,
            hasNextPage: true,
          },
        }),
      });

      await client.listCustomers({ skip: 20, limit: 15 });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('skip=20');
      expect(callUrl).toContain('limit=15');
    });

    it('should return PaginatedResult with items array', async () => {
      const customerItems: Customer[] = [
        {
          name: 'Customer One',
          email: 'cust1@example.com',
          taxID: { taxID: '11111111111', type: 'BR:CPF' },
          createdAt: '2026-02-12T10:00:00Z',
          updatedAt: '2026-02-12T10:00:00Z',
        },
        {
          name: 'Customer Two',
          email: 'cust2@example.com',
          taxID: { taxID: '22222222222', type: 'BR:CPF' },
          createdAt: '2026-02-12T11:00:00Z',
          updatedAt: '2026-02-12T11:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: customerItems,
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 2,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listCustomers();

      expect(result.items).toEqual(customerItems);
      expect(result.items).toHaveLength(2);
    });

    it('should return pageInfo with skip, limit, totalCount, hasNextPage', async () => {
      const expectedPageInfo: PageInfo = {
        skip: 10,
        limit: 10,
        totalCount: 50,
        hasNextPage: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: expectedPageInfo,
        }),
      });

      const result = await client.listCustomers({ skip: 10, limit: 10 });

      expect(result.pageInfo).toEqual(expectedPageInfo);
      expect(result.pageInfo.skip).toBe(10);
      expect(result.pageInfo.limit).toBe(10);
      expect(result.pageInfo.totalCount).toBe(50);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should handle empty results correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      const result = await client.listCustomers();

      expect(result.items).toEqual([]);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.totalCount).toBe(0);
    });

    it('should handle default pagination (skip=0, limit=10)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
          pageInfo: {
            skip: 0,
            limit: 10,
            totalCount: 0,
            hasNextPage: false,
          },
        }),
      });

      await client.listCustomers();

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('skip=0');
      expect(callUrl).toContain('limit=10');
    });
  });
});
