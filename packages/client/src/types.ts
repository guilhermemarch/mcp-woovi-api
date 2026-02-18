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
  redirectUrl?: string;
  ensureSameTaxID?: boolean;
  discountSettings?: {
    modality: 'fixed' | 'percentage';
    amount: number;
  };
  splits?: {
    pixKey: string;
    splitType: 'fixed' | 'percentage';
    amount: number;
  }[];
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
  redirectUrl?: string;
  discountSettings?: {
    modality: 'fixed' | 'percentage';
    amount: number;
  };
  splits?: {
    pixKey: string;
    splitType: 'fixed' | 'percentage';
    amount: number;
  }[];
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

export interface ChargeRefundInput {
  value?: number;
  correlationID?: string;
  description?: string;
}

export interface RefundInput {
  correlationID: string;
  value: number;
  transactionEndToEndId: string;
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
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: PageInfo;
}
