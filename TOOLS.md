# Woovi MCP Tools Catalog

Complete reference for all 10 MCP tools provided by the Woovi MCP Server.

## Charge Tools

### create_charge

Create a new Pix charge (payment request).

**Input Schema:**
```typescript
{
  amount: number;           // Required: Amount in centavos (5000 = R$ 50.00)
  description?: string;     // Optional: Charge description
  customer?: {              // Optional: Customer information
    name: string;
    email?: string;
    phone?: string;
    taxID?: string;         // CPF (11 digits) or CNPJ (14 digits)
  };
  metadata?: Record<string, any>;  // Optional: Custom metadata
}
```

**Output:**
```typescript
{
  charge: string;           // Base64-encoded charge ID
  correlationID: string;    // Unique correlation identifier
  value: number;            // Amount in centavos
  status: string;           // 'active', 'completed', or 'expired'
  brCode: string;           // Pix copy-paste code
  qrCodeImage: string;      // Base64-encoded QR code image
  createdAt: string;        // ISO 8601 timestamp
}
```

**Description:** Creates a new Pix charge with QR code and payment link. Amount must be specified in centavos.

---

### get_charge

Retrieve charge details by correlation ID.

**Input Schema:**
```typescript
{
  correlationID: string;    // Required: Unique correlation identifier
}
```

**Output:**
```typescript
{
  charge: string;
  correlationID: string;
  value: number;
  status: string;
  brCode: string;
  qrCodeImage: string;
  createdAt: string;
  // ... additional charge details
}
```

**Description:** Fetches complete charge information including status, amount, and payment codes.

---

### list_charges

List charges with optional filtering and pagination.

**Input Schema:**
```typescript
{
  status?: 'active' | 'completed' | 'expired';  // Optional: Filter by status
  startDate?: string;       // Optional: Start date (ISO 8601)
  endDate?: string;         // Optional: End date (ISO 8601)
  skip?: number;            // Optional: Pagination offset (default: 0)
  limit?: number;           // Optional: Max results (default: 10)
}
```

**Output:**
```typescript
{
  charges: Array<Charge>;   // Array of charge objects
  skip: number;
  limit: number;
  totalCount: number;
  hasNextPage: boolean;
}
```

**Description:** Retrieves a paginated list of charges with optional status and date range filters.

---

## Customer Tools

### create_customer

Create a new customer record.

**Input Schema:**
```typescript
{
  name: string;             // Required: Customer name
  email: string;            // Required: Customer email
  phone?: string;           // Optional: Phone number
  taxID?: string;           // Optional: CPF (11 digits) or CNPJ (14 digits)
  address?: {               // Optional: Address information
    zipcode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}
```

**Output:**
```typescript
{
  customer: string;         // Customer ID
  name: string;
  email: string;
  taxID?: {                 // Structured tax ID
    taxID: string;
    type: 'BR:CPF' | 'BR:CNPJ';
  };
  // ... additional customer details
}
```

**Description:** Creates a new customer with name, email, and optional tax ID (CPF/CNPJ). Tax ID type is auto-detected based on length.

---

### get_customer

Retrieve customer details by ID or email.

**Input Schema:**
```typescript
{
  id: string;               // Required: Customer ID or email address
}
```

**Output:**
```typescript
{
  customer: string;
  name: string;
  email: string;
  taxID?: {
    taxID: string;
    type: 'BR:CPF' | 'BR:CNPJ';
  };
  // ... additional customer details
}
```

**Description:** Fetches customer information. Automatically detects if input is email (@) or customer ID. Result is cached for 60 seconds.

---

### list_customers

List customers with pagination.

**Input Schema:**
```typescript
{
  skip?: number;            // Optional: Pagination offset (default: 0)
  limit?: number;           // Optional: Max results (default: 10)
}
```

**Output:**
```typescript
{
  customers: Array<Customer>;  // Array of customer objects
  skip: number;
  limit: number;
  totalCount: number;
  hasNextPage: boolean;
}
```

**Description:** Retrieves a paginated list of all customers.

---

## Transaction Tools

### get_transactions

List account transactions with pagination.

**Input Schema:**
```typescript
{
  startDate?: string;       // Optional: Start date (ISO 8601)
  endDate?: string;         // Optional: End date (ISO 8601)
  skip?: number;            // Optional: Pagination offset (default: 0)
  limit?: number;           // Optional: Max results (default: 10)
}
```

**Output:**
```typescript
{
  transactions: Array<Transaction>;  // Array of transaction objects
  skip: number;
  limit: number;
  totalCount: number;
  hasNextPage: boolean;
}
```

**Description:** Fetches transaction history with optional date range filtering and pagination.

---

### get_balance

Retrieve current account balance.

**Input Schema:**
```typescript
{}  // No input required
```

**Output:**
```typescript
{
  balance: number;          // Available balance in centavos
  totalAmount: number;      // Total amount in centavos
}
```

**Description:** Returns current account balance. Result is cached for 60 seconds to reduce API load.

---

## Refund Tools

### create_refund

Create a refund for an existing charge.

**Input Schema:**
```typescript
{
  correlationID: string;    // Required: Charge correlation ID
  value?: number;           // Optional: Refund amount in centavos (defaults to full amount)
  comment?: string;         // Optional: Refund reason/comment
}
```

**Output:**
```typescript
{
  refund: string;           // Refund ID
  correlationID: string;    // Original charge correlation ID
  value: number;            // Refund amount in centavos
  status: string;           // Refund status
  createdAt: string;        // ISO 8601 timestamp
}
```

**Description:** Creates a full or partial refund for a charge. Refund amount must be in centavos.

---

### get_refund

Retrieve refund details by ID.

**Input Schema:**
```typescript
{
  id: string;               // Required: Refund ID
}
```

**Output:**
```typescript
{
  refund: string;
  correlationID: string;
  value: number;
  status: string;
  createdAt: string;
  // ... additional refund details
}
```

**Description:** Fetches complete refund information including status and amounts.

---

## Common Patterns

### Amount Values

All monetary values are specified in centavos (1/100 of a real):
- R$ 1.00 = 100 centavos
- R$ 50.00 = 5000 centavos
- R$ 1,250.00 = 125000 centavos

### Pagination

List operations support offset-based pagination:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 10)
- Response includes `hasNextPage` boolean and `totalCount`

### CPF/CNPJ Handling

Tax IDs are automatically classified:
- **CPF**: 11 digits (e.g., "12345678901")
- **CNPJ**: 14 digits (e.g., "12345678000190")

No formatting required - provide digits only.

### Error Handling

All tools return errors in a consistent format:
```typescript
{
  content: [{ type: 'text', text: 'Error: [message]' }],
  isError: true
}
```

### Caching

The following operations are cached for 60 seconds:
- `get_balance`
- `get_customer` (by ID or email)

This reduces API load for frequently accessed data.
