import type { ChargeInput, Charge, CustomerInput, Customer, PaginatedResult, Transaction, Balance, RefundInput, Refund } from './types.js';
export declare class WooviClient {
    private appId;
    private baseUrl;
    private cache;
    constructor(appId: string, baseUrl?: string);
    private makeRequest;
    private sleep;
    private maskTaxID;
    private maskPhone;
    createCharge(data: ChargeInput): Promise<Charge>;
    getCharge(correlationID: string): Promise<Charge>;
    listCharges(filters?: {
        skip?: number;
        limit?: number;
        status?: string;
    }): Promise<PaginatedResult<Charge>>;
    createCustomer(data: CustomerInput): Promise<Customer>;
    getCustomer(idOrEmail: string): Promise<Customer>;
    listCustomers(filters?: {
        search?: string;
        skip?: number;
        limit?: number;
    }): Promise<PaginatedResult<Customer>>;
    listTransactions(filters?: {
        skip?: number;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<PaginatedResult<Transaction>>;
    getBalance(accountId?: string): Promise<Balance>;
    createRefund(chargeId: string, data: RefundInput): Promise<Refund>;
    getRefund(refundId: string): Promise<Refund>;
}
//# sourceMappingURL=client.d.ts.map