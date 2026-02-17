import { describe, it, expect } from 'vitest';
import type {
  ChargeInput,
  Charge,
  CustomerInput,
  Customer,
  Transaction,
  Balance,
  RefundInput,
  Refund,
  PaginatedResult,
} from './types';

describe('Type Definitions', () => {
  describe('ChargeInput', () => {
    it('should accept valid charge input with value and correlationID', () => {
      const charge: ChargeInput = {
        value: 5000,
        correlationID: 'test-uuid-123',
      };
      expect(charge.value).toBe(5000);
      expect(charge.correlationID).toBe('test-uuid-123');
    });

    it('should accept optional type, comment, customer, and expiresIn', () => {
      const charge: ChargeInput = {
        value: 1000,
        correlationID: 'test-uuid-456',
        type: 'DYNAMIC',
        comment: 'Test comment',
        customer: { name: 'John', email: 'john@test.com' },
        expiresIn: 3600,
      };
      expect(charge.type).toBe('DYNAMIC');
      expect(charge.comment).toBe('Test comment');
      expect(charge.expiresIn).toBe(3600);
    });
  });

  describe('Charge', () => {
    it('should have all required fields from API response', () => {
      const charge: Charge = {
        value: 5000,
        correlationID: 'corr-1',
        identifier: 'id-1',
        transactionID: 'tx-1',
        status: 'ACTIVE',
        brCode: '00020126...',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-1',
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };
      expect(charge.correlationID).toBe('corr-1');
      expect(charge.value).toBe(5000);
      expect(charge.status).toBe('ACTIVE');
      expect(charge.brCode).toBeDefined();
    });
  });

  describe('TaxID', () => {
    it('should represent CPF as object', () => {
      const customer: CustomerInput = {
        name: 'John',
        taxID: {
          taxID: '12345678901',
          type: 'BR:CPF',
        },
      };
      expect(customer.taxID!.type).toBe('BR:CPF');
      expect(customer.taxID!.taxID).toBe('12345678901');
    });

    it('should represent CNPJ as object', () => {
      const customer: CustomerInput = {
        name: 'Company',
        taxID: {
          taxID: '12345678901234',
          type: 'BR:CNPJ',
        },
      };
      expect(customer.taxID!.type).toBe('BR:CNPJ');
      expect(customer.taxID!.taxID).toBe('12345678901234');
    });
  });

  describe('Customer', () => {
    it('should have all required fields', () => {
      const customer: Customer = {
        name: 'John Doe',
        taxID: {
          taxID: '12345678901',
          type: 'BR:CPF',
        },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };
      expect(customer.name).toBe('John Doe');
      expect(customer.taxID!.type).toBe('BR:CPF');
    });

    it('should accept optional email and phone', () => {
      const customer: Customer = {
        name: 'John',
        email: 'john@example.com',
        phone: '+5511999999999',
        taxID: {
          taxID: '12345678901',
          type: 'BR:CPF',
        },
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };
      expect(customer.email).toBe('john@example.com');
      expect(customer.phone).toBe('+5511999999999');
    });
  });

  describe('Transaction', () => {
    it('should have all required fields', () => {
      const transaction: Transaction = {
        value: 5000,
        type: 'DEBIT',
        status: 'COMPLETED',
        createdAt: '2026-02-12T10:00:00Z',
      };
      expect(transaction.value).toBe(5000);
      expect(transaction.type).toBe('DEBIT');
    });
  });

  describe('Balance', () => {
    it('should represent account balance with total, blocked, available', () => {
      const balance: Balance = {
        total: 100000,
        blocked: 20000,
        available: 80000,
      };
      expect(balance.total).toBe(100000);
      expect(balance.blocked).toBe(20000);
      expect(balance.available).toBe(80000);
    });
  });

  describe('RefundInput', () => {
    it('should accept valid refund input with correlationID and value', () => {
      const refund: RefundInput = {
        correlationID: 'refund-corr-1',
        value: 5000,
      };
      expect(refund.correlationID).toBe('refund-corr-1');
      expect(refund.value).toBe(5000);
    });

    it('should accept optional comment', () => {
      const refund: RefundInput = {
        correlationID: 'refund-corr-2',
        value: 5000,
        comment: 'Customer request',
      };
      expect(refund.comment).toBe('Customer request');
    });
  });

  describe('Refund', () => {
    it('should have all required fields', () => {
      const refund: Refund = {
        correlationID: 'refund-corr-1',
        value: 5000,
        status: 'COMPLETED',
        comment: 'Customer request',
        createdAt: '2026-02-12T10:00:00Z',
      };
      expect(refund.correlationID).toBe('refund-corr-1');
      expect(refund.value).toBe(5000);
      expect(refund.status).toBe('COMPLETED');
    });
  });

  describe('PaginatedResult', () => {
    it('should have generic items and pageInfo', () => {
      const result: PaginatedResult<Charge> = {
        items: [
          {
            value: 5000,
            correlationID: 'corr-1',
            identifier: 'id-1',
            transactionID: 'tx-1',
            status: 'ACTIVE',
            brCode: 'br-code',
            paymentLinkUrl: 'https://pay.woovi.com/...',
            qrCodeImage: 'https://api.woovi.com/qr/...',
            pixKey: 'pix-key',
            expiresDate: '2026-03-01T00:00:00Z',
            type: 'DYNAMIC',
            globalID: 'global-1',
            createdAt: '2026-02-12T10:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
        ],
        pageInfo: {
          skip: 0,
          limit: 10,
          totalCount: 1,
          hasNextPage: false,
        },
      };
      expect(result.items).toHaveLength(1);
      expect(result.pageInfo.skip).toBe(0);
      expect(result.pageInfo.limit).toBe(10);
      expect(result.pageInfo.totalCount).toBe(1);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should work with Customer items', () => {
      const result: PaginatedResult<Customer> = {
        items: [
          {
            name: 'John',
            taxID: {
              taxID: '12345678901',
              type: 'BR:CPF',
            },
            createdAt: '2026-02-12T10:00:00Z',
            updatedAt: '2026-02-12T10:00:00Z',
          },
        ],
        pageInfo: {
          skip: 0,
          limit: 20,
          totalCount: 100,
          hasNextPage: true,
        },
      };
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.totalCount).toBe(100);
    });
  });

  describe('Monetary values in centavos', () => {
    it('should represent 5000 centavos as R$ 50.00', () => {
      const charge: Charge = {
        value: 5000,
        correlationID: 'corr-cents',
        identifier: 'id-cents',
        transactionID: 'tx-cents',
        status: 'ACTIVE',
        brCode: 'br-code',
        paymentLinkUrl: 'https://pay.woovi.com/...',
        qrCodeImage: 'https://api.woovi.com/qr/...',
        pixKey: 'pix-key',
        expiresDate: '2026-03-01T00:00:00Z',
        type: 'DYNAMIC',
        globalID: 'global-cents',
        createdAt: '2026-02-12T10:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
      };
      expect(charge.value).toBe(5000);
    });
  });
});
