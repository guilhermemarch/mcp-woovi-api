# Woovi MCP Server

Model Context Protocol server for Woovi/OpenPix. It exposes Pix charges, customers, transactions, balance, refunds, resources, and reusable prompts so AI assistants like Claude can operate against the Woovi API with a clean MCP surface.

## What is implemented

- 10 required MCP tools:
  - `create_charge`, `get_charge`, `list_charges`
  - `create_customer`, `get_customer`, `list_customers`
  - `get_transactions`, `get_balance`
  - `create_refund`, `get_refund`
- 3 required MCP resources:
  - `balance`
  - `endpoints`
  - `webhook_schemas`
- 3 required MCP prompts:
  - `daily_summary`
  - `customer_report`
  - `reconciliation_check`
- Bonus capabilities:
  - `list_accounts`
  - `get_charge_analytics`
  - `get_customer_payment_summary`
  - SSE event stream at `GET /events`
  - webhook ingress endpoint at `POST /webhooks/events`
  - multi-account balance lookup through `accountId`
  - cache TTL for customer lookups and tool-driven balance reads

## Stack

- TypeScript
- `@modelcontextprotocol/sdk`
- Zod validation
- reusable `@woovi/client` package
- stdio and HTTP transports

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm start:stdio
```

To run the HTTP transport instead:

```bash
pnpm start:http
```

To validate the live sandbox flow with your Woovi credential:

```bash
pnpm smoke:sandbox
```

## Environment

Use sandbox values while developing:

```env
WOOVI_APP_ID=your_sandbox_app_id_here
WOOVI_API_URL=https://api.woovi-sandbox.com
WOOVI_AUTH_MODE=raw
WOOVI_LOG_LEVEL=info
PORT=3000
MCP_HTTP_AUTH_TOKEN=replace-with-strong-random-token
WOOVI_WEBHOOK_INGRESS_TOKEN=
```

Notes:
- `WOOVI_AUTH_MODE=raw` sends `Authorization: <appId>`
- `WOOVI_AUTH_MODE=bearer` sends `Authorization: Bearer <appId>`
- `MCP_HTTP_AUTH_TOKEN` is required for the HTTP transport and protects `POST /mcp` and `GET /events`
- `WOOVI_WEBHOOK_INGRESS_TOKEN` enables and protects `POST /webhooks/events`

## Claude Desktop

Example config is in [config/claude-desktop.example.json](/home/guilherme/Desktop/mcp-woovi-server-ts/config/claude-desktop.example.json).

The relevant entry is:

```json
{
  "mcpServers": {
    "woovi": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-woovi-server-ts/packages/server/dist/stdio.js"
      ],
      "env": {
        "WOOVI_APP_ID": "your-sandbox-app-id",
        "WOOVI_API_URL": "https://api.woovi-sandbox.com"
      }
    }
  }
}
```

## HTTP transport

Endpoints:

- `POST /mcp`: Streamable HTTP MCP endpoint
- `GET /healthz`: health check
- `GET /events`: SSE stream for webhook notifications
- `POST /webhooks/events`: publish webhook payloads into the SSE bus when `WOOVI_WEBHOOK_INGRESS_TOKEN` is configured

Example:

```bash
curl -H "Authorization: Bearer $MCP_HTTP_AUTH_TOKEN" \
  http://localhost:3000/healthz
```

## Docker

Build and run the HTTP transport in a container:

```bash
docker build -t woovi-mcp-server .
docker run --rm -p 3000:3000 \
  -e WOOVI_APP_ID=your-sandbox-app-id \
  -e WOOVI_API_URL=https://api.woovi-sandbox.com \
  -e MCP_HTTP_AUTH_TOKEN=replace-with-strong-random-token \
  woovi-mcp-server
```

## Developer commands

```bash
pnpm build
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
pnpm typecheck
pnpm quality
pnpm smoke:sandbox
pnpm verify:build
```

`pnpm verify:build` compiles the repo and verifies the exposed MCP surface in-memory.
`pnpm quality` is the single-command local gate used for challenge readiness: build, typecheck, coverage threshold, and MCP surface verification.
`pnpm smoke:sandbox` builds the repo, starts the `stdio` server, and validates the live sandbox flow through the MCP client.

## Project layout

```text
packages/client/src
  cache.ts
  client.ts
  logger.ts
  types.ts

packages/client/tests/unit
  *.test.ts

packages/server/src
  core/config.ts
  core/event-bus.ts
  domains/
  mcp/register.ts
  tools/
  resources/
  prompts/
  transports/
  server.ts
  stdio.ts
  http.ts
  index.ts

packages/server/tests
  unit/
  integration/
```

## Docs

- [docs/tools/README.md](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/tools/README.md)
- [docs/architecture/README.md](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/architecture/README.md)
- [docs/qa/api-parity-matrix.md](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/qa/api-parity-matrix.md)
- [docs/postman/woovi-api.postman_collection.json](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/postman/woovi-api.postman_collection.json)
- [docs/postman/mcp-http.postman_collection.json](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/postman/mcp-http.postman_collection.json)
- [docs/demo/README.md](/home/guilherme/Desktop/mcp-woovi-server-ts/docs/demo/README.md)

## Verification status

Current local status:

- `pnpm build` passes
- `pnpm test` passes
- `pnpm test:coverage` passes
- `node scripts/verify-challenge.mjs` passes
- `pnpm smoke:sandbox` passed against the Woovi sandbox on March 12, 2026 when `WOOVI_APP_ID` was provided
- `pnpm audit --prod --json` reports `0` production vulnerabilities after pinning patched transitive dependencies through `pnpm.overrides`

Coverage gate:

- statements: `>= 80%`
- lines: `>= 80%`
- functions: `>= 80%`
- branches: `>= 65%`

## Important behavior

- values are always in centavos
- sensitive fields are masked in logs and MCP outputs where appropriate
- 429 responses, transient fetch failures, and timeouts are retried with backoff in `@woovi/client`
- `get_customer` uses the documented customer identifier path (`correlationID` or `taxID`)
- the Woovi sandbox may resolve `create_customer.correlationID` to a provider-generated identifier; use the returned customer payload for follow-up reads
- `list_customers` supports an MCP-level `search` filter applied across paginated upstream customer results without sending undocumented query parameters
- `get_balance` returns the selected account summary with nested `balance` fields and defaults to fresh reads; `fresh: false` opts into the 60-second cache
- balance resources (`woovi://balance/current` and `woovi://balance/{accountId}`) always bypass cache for real-time reads
- `create_refund` supports both refund flows:
  - charge refund via `chargeID`
  - Pix transaction refund via `transactionEndToEndId`
  - the MCP schema enforces exactly one of those identifiers
- `/webhooks/events` normalizes inbound payloads and masks sensitive data before broadcasting through `GET /events`
