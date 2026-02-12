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
    it('should accept valid charge input', () => {
      const charge: ChargeInput = {
        amount: 5000,
        description: 'Test charge',
      };
      expect(charge.amount).toBe(5000);
      expect(charge.description).toBe('Test charge');
    });

    it('should accept optional status', () => {
      const charge: ChargeInput = {
        amount: 1000,
        description: 'Test',
        status: 'ACTIVE',
      };
      expect(charge.status).toBe('ACTIVE');
    });
  });

  describe('Charge', () => {
    it('should have all required fields', () => {
      const charge: Charge = {
        id: 'charge-1',
        amount: 5000,
        description: 'Test charge',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(charge.id).toBe('charge-1');
      expect(charge.amount).toBe(5000);
      expect(charge.status).toBe('ACTIVE');
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
      expect(customer.taxID.type).toBe('BR:CPF');
      expect(customer.taxID.taxID).toBe('12345678901');
    });

    it('should represent CNPJ as object', () => {
      const customer: CustomerInput = {
        name: 'Company',
        taxID: {
          taxID: '12345678901234',
          type: 'BR:CNPJ',
        },
      };
      expect(customer.taxID.type).toBe('BR:CNPJ');
      expect(customer.taxID.taxID).toBe('12345678901234');
    });
  });

  describe('Customer', () => {
    it('should have all required fields', () => {
      const customer: Customer = {
        id: 'customer-1',
        name: 'John Doe',
        taxID: {
          taxID: '12345678901',
          type: 'BR:CPF',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(customer.id).toBe('customer-1');
      expect(customer.name).toBe('John Doe');
      expect(customer.taxID.type).toBe('BR:CPF');
    });

    it('should accept optional email', () => {
      const customer: Customer = {
        id: 'customer-1',
        name: 'John',
        email: 'john@example.com',
        taxID: {
          taxID: '12345678901',
          type: 'BR:CPF',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(customer.email).toBe('john@example.com');
    });
  });

  describe('Transaction', () => {
    it('should have all required fields', () => {
      const transaction: Transaction = {
        id: 'tx-1',
        chargeId: 'charge-1',
        amount: 5000,
        type: 'DEBIT',
        status: 'COMPLETED',
        createdAt: new Date(),
      };
      expect(transaction.id).toBe('tx-1');
      expect(transaction.chargeId).toBe('charge-1');
      expect(transaction.type).toBe('DEBIT');
    });
  });

  describe('Balance', () => {
    it('should represent account balance', () => {
      const balance: Balance = {
        available: 10000,
        pending: 2000,
      };
      expect(balance.available).toBe(10000);
      expect(balance.pending).toBe(2000);
    });
  });

  describe('RefundInput', () => {
    it('should accept valid refund input', () => {
      const refund: RefundInput = {
        chargeId: 'charge-1',
        amount: 5000,
      };
      expect(refund.chargeId).toBe('charge-1');
      expect(refund.amount).toBe(5000);
    });

    it('should accept optional reason', () => {
      const refund: RefundInput = {
        chargeId: 'charge-1',
        amount: 5000,
        reason: 'Customer request',
      };
      expect(refund.reason).toBe('Customer request');
    });
  });

  describe('Refund', () => {
    it('should have all required fields', () => {
      const refund: Refund = {
        id: 'refund-1',
        chargeId: 'charge-1',
        amount: 5000,
        status: 'COMPLETED',
        reason: 'Customer request',
        createdAt: new Date(),
      };
      expect(refund.id).toBe('refund-1');
      expect(refund.chargeId).toBe('charge-1');
      expect(refund.status).toBe('COMPLETED');
    });
  });

  describe('PaginatedResult', () => {
    it('should have generic items and pageInfo', () => {
      const result: PaginatedResult<Charge> = {
        items: [
          {
            id: 'charge-1',
            amount: 5000,
            description: 'Test',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
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
            id: 'cust-1',
            name: 'John',
            taxID: {
              taxID: '12345678901',
              type: 'BR:CPF',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
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
        id: 'charge-1',
        amount: 5000,
        description: 'R$ 50.00',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(charge.amount).toBe(5000);
    });
  });
});
