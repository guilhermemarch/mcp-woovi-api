# Woovi MCP Tool Catalog

This project exposes 10 core challenge tools and 3 bonus tools.

## Core tools

### `create_charge`
- Purpose: create a Pix charge.
- Key input:
  - `value`
  - `correlationID`
  - `customer`
  - optional `comment`, `type`, `expiresIn`, `additionalInfo`, `redirectUrl`, `ensureSameTaxID`, `discountSettings`, `splits`
- Output: charge payload with QR code data, payment link, status, and identifiers.

### `get_charge`
- Purpose: fetch one charge by correlation ID.
- Key input:
  - `correlationID`

### `list_charges`
- Purpose: list charges with filters and pagination.
- Key input:
  - optional `status`
  - optional `startDate`, `endDate`
  - optional `customer`
  - optional `skip`, `limit`

### `create_customer`
- Purpose: register a customer.
- Key input:
  - `name`
  - at least one of `taxID`, `email`, or `phone`
  - optional `correlationID`, `address`

### `get_customer`
- Purpose: fetch a customer by correlation ID or tax ID.
- Key input:
  - `customerId`

### `list_customers`
- Purpose: search and paginate customers.
- Key input:
  - optional `search`
  - optional `skip`, `limit`
- Notes:
  - the upstream request uses the documented `/api/v1/customer` pagination parameters
  - the optional `search` filter is applied by this MCP server over the fetched customer page

### `get_transactions`
- Purpose: list transactions with date filters and pagination.
- Key input:
  - optional `startDate`, `endDate`
  - optional `skip`, `limit`

### `get_balance`
- Purpose: fetch current account balance.
- Key input:
  - optional `accountId`

### `create_refund`
- Purpose: create a refund using one of two supported flows.
- Key input:
  - `correlationID`
  - `value`
  - one of:
    - `chargeID`
    - `transactionEndToEndId`
  - optional `comment`

### `get_refund`
- Purpose: fetch refund details.
- Key input:
  - `refundID`

## Bonus tools

### `list_accounts`
- Lists available Woovi accounts and balance snapshots.

### `get_charge_analytics`
- Aggregates charges by status and total value.

### `get_customer_payment_summary`
- Composes customer lookup with charge history analysis using `customerId`.

## Resources

### Fixed resources
- `balance`
- `endpoints`
- `webhook_schemas`

### Resource templates
- `account_balance` using `woovi://balance/{accountId}`
- `endpoint_docs` using `woovi://docs/{endpoint}`

## Prompts

### `daily_summary`
- Guides the assistant through balance, transaction, and charge summary generation for a date window.

### `customer_report`
- Guides the assistant through customer lookup plus payment-history analysis.

### `reconciliation_check`
- Guides the assistant through expected-vs-received payment comparison.

## Related files

- MCP capability registry: [packages/server/src/mcp/register.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/mcp/register.ts)
- Resources: [packages/server/src/resources/index.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/resources/index.ts)
- Prompts: [packages/server/src/prompts/index.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/prompts/index.ts)
