import type { ChargeInput, Charge, PaginatedResult } from './types';
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
}
//# sourceMappingURL=client.d.ts.map