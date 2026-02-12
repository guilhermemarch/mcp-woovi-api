export interface TaxID {
    taxID: string;
    type: 'BR:CPF' | 'BR:CNPJ';
}
export interface ChargeInput {
    amount: number;
    description: string;
    status?: string;
}
export interface Charge {
    id: string;
    amount: number;
    description: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CustomerInput {
    name: string;
    email?: string;
    taxID: TaxID;
}
export interface Customer {
    id: string;
    name: string;
    email?: string;
    taxID: TaxID;
    createdAt: Date;
    updatedAt: Date;
}
export interface Transaction {
    id: string;
    chargeId: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    status: string;
    createdAt: Date;
}
export interface Balance {
    available: number;
    pending: number;
}
export interface RefundInput {
    chargeId: string;
    amount: number;
    reason?: string;
}
export interface Refund {
    id: string;
    chargeId: string;
    amount: number;
    status: string;
    reason?: string;
    createdAt: Date;
}
export interface PageInfo {
    skip: number;
    limit: number;
    totalCount: number;
    hasNextPage: boolean;
}
export interface PaginatedResult<T> {
    items: T[];
    pageInfo: PageInfo;
}
//# sourceMappingURL=types.d.ts.map