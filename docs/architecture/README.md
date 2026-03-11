# Architecture

## Overview

The repository is split into two packages:

- `@woovi/client`: reusable Woovi/OpenPix SDK
- `@woovi/server`: MCP layer that exposes tools, resources, prompts, and transports

```mermaid
graph TD
    Assistant[AI Assistant]
    MCP[MCP Server]
    Client[@woovi/client]
    API[Woovi/OpenPix API]
    SSE[SSE Event Bus]

    Assistant --> MCP
    MCP --> Client
    Client --> API
    API --> Client
    MCP --> SSE
```

## Package responsibilities

### `packages/client`
- request execution
- auth header handling
- timeout handling
- retry on `429`
- cache for customer and tool-driven balance reads
- structured logging with masking
- TypeScript API types

Main file:
- [packages/client/src/client.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/client/src/client.ts)

### `packages/server`
- MCP tool definitions
- resource definitions
- prompt definitions
- domain-facing registry layer
- environment-backed configuration
- stdio and HTTP transports
- webhook event bus used by the SSE endpoint

Important files:
- [packages/server/src/server.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/server.ts)
- [packages/server/src/core/config.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/core/config.ts)
- [packages/server/src/mcp/register.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/mcp/register.ts)
- [packages/server/src/domains/index.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/domains/index.ts)
- [packages/server/src/http.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/http.ts)
- [packages/server/src/stdio.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/stdio.ts)

## Runtime assembly

`createWooviMcpServer()` builds the runtime:

1. load config
2. build `WooviClient`
3. create `McpServer`
4. register tools
5. register resources
6. register prompts
7. return runtime dependencies for transports

That makes the MCP layer testable without forcing process-level side effects during import.

## Transport model

### Stdio
- entrypoint: [packages/server/src/stdio.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/stdio.ts)
- transport implementation: [packages/server/src/transports/stdio.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/transports/stdio.ts)
- intended for Claude Desktop and local MCP clients

### HTTP
- entrypoint: [packages/server/src/http.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/http.ts)
- transport implementation: [packages/server/src/transports/http.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/transports/http.ts)
- exposes:
  - `POST /mcp`
  - `GET /healthz`
  - `GET /events`
  - `POST /webhooks/events`

Security controls:
- required bearer token for MCP HTTP access
- webhook ingress route is disabled unless a dedicated bearer token is configured

## Bonus capabilities implemented

- caching with TTL in the client
- multi-account support through `list_accounts`, `get_balance(accountId)`, and `account_balance` resource template
- analytics/composable tools
- SSE webhook event stream backed by [packages/server/src/core/event-bus.ts](/home/guilherme/Desktop/mcp-woovi-server-ts/packages/server/src/core/event-bus.ts)

## Testing strategy

- client unit tests
- tool/resource/prompt unit tests
- unit tests separated physically under `packages/*/tests/unit`
- in-memory MCP integration tests
- build-time verification script:
  - [scripts/verify-challenge.mjs](/home/guilherme/Desktop/mcp-woovi-server-ts/scripts/verify-challenge.mjs)

## Current constraints

- real sandbox calls are not part of the automated local suite
- the `list_customers` search option is implemented in the MCP/client layer as a local filter over the fetched page because `api-doc.yaml` does not document a server-side `search` query parameter
- the HTTP event stream is an internal SSE channel fed by `/webhooks/events`; it is not a direct subscription to the upstream Woovi platform
- bearer mode is supported, but a full OAuth grant/refresh flow is not implemented in this repository
