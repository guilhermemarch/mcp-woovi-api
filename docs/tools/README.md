# Woovi MCP Tool Catalog

This server exposes the 10 required challenge tools plus 3 bonus tools.

## Core Tools

### `create_charge`
- Purpose: create a Pix charge.
- Key input:
  - `value`, `correlationID`
  - optional `type`, `comment`, `expiresIn`, `expiresDate`, `fixedLocation`
  - optional `customer` with `name`, `email`, `phone`, `taxID`, `correlationID`, `address`
  - optional `additionalInfo`, `redirectUrl`, `ensureSameTaxID`, `discountSettings`, `splits`
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
  - optional `customer`, `subscription`
  - optional `skip`, `limit`

### `create_customer`
- Purpose: register a customer.
- Key input:
  - `name`
  - at least one of `taxID`, `email`, or `phone`
  - optional `correlationID`, `address`
- Notes:
  - Woovi sandbox responses may replace the requested `correlationID` with the provider-generated identifier returned in the response body

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
  - upstream requests use only the documented `/api/v1/customer` pagination parameters
  - the optional `search` filter is applied by this MCP server across paginated upstream results, not just the first page

### `get_transactions`
- Purpose: list transactions with date filters and pagination.
- Key input:
  - optional `startDate`, `endDate`
  - optional `charge`, `pixQrCode`, `withdrawal`
  - optional `skip`, `limit`

### `get_balance`
- Purpose: fetch the current account summary and nested balance values.
- Key input:
  - optional `accountId`
  - optional `fresh` with default `true`
- Notes:
  - returns the selected account object, not just the `balance` leaf
  - `fresh: false` opts into the 60-second client cache

### `create_refund`
- Purpose: create a refund using one of two supported flows.
- Key input:
  - `correlationID`
  - `value`
  - exactly one of:
    - `chargeID`
    - `transactionEndToEndId`
  - optional `comment`

### `get_refund`
- Purpose: fetch refund details.
- Key input:
  - `refundID`

## Bonus Tools

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
- Parity matrix: [docs/qa/api-parity-matrix.md](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/qa/api-parity-matrix.md)
