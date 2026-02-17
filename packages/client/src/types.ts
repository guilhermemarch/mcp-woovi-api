export interface TaxID {
  taxID: string;
  type: 'BR:CPF' | 'BR:CNPJ';
}

export interface ChargeInput {
  value: number;
  correlationID: string;
  type?: 'DYNAMIC' | 'OVERDUE' | 'BOLETO';
  comment?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    taxID?: string;
  };
  expiresIn?: number;
  additionalInfo?: { key: string; value: string }[];
}

export interface Charge {
  value: number;
  correlationID: string;
  identifier: string;
  transactionID: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  brCode: string;
  paymentLinkUrl: string;
  qrCodeImage: string;
  pixKey: string;
  expiresDate: string;
  type: string;
  globalID: string;
  customer?: Customer;
  additionalInfo?: { key: string; value: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  taxID?: TaxID;
  correlationID?: string;
}

export interface Customer {
  name: string;
  email?: string;
  phone?: string;
  taxID?: TaxID;
  correlationID?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  value: number;
  type: string;
  status: string;
  correlationID?: string;
  createdAt: string;
}

export interface Balance {
  total: number;
  blocked: number;
  available: number;
}

export interface RefundInput {
  correlationID: string;
  value: number;
  comment?: string;
}

export interface Refund {
  correlationID: string;
  value: number;
  status: string;
  comment?: string;
  createdAt: string;
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
