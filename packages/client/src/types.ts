export interface TaxID {
  taxID: string;
  type: 'BR:CPF' | 'BR:CNPJ';
}

export interface ChargeInput {
  value: number;
  correlationID: string;
  type?: 'DYNAMIC' | 'OVERDUE';
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
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  brCode: string;
  paymentLinkUrl: string;
  qrCodeImage: string;
  expiresDate: string;
  customer?: Customer;
  additionalInfo?: { key: string; value: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  zipcode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  taxID?: string;
  correlationID?: string;
  address?: Address;
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
  type: 'PAYMENT' | 'WITHDRAW' | 'REFUND' | 'FEE';
  status: 'CREATED' | 'CONFIRMED' | 'REFUNDED' | 'DENIED';
  correlationID?: string;
  endToEndID?: string;
  time?: string;
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
  refundId: string;
  correlationID: string;
  value: number;
  status: 'IN_PROCESSING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';
  comment?: string;
  time: string;
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
