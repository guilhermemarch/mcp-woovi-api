# Woovi MCP Server

Model Context Protocol (MCP) server for the Woovi/OpenPix API, enabling AI assistants to interact with Woovi's financial services including Pix payments, customer management, transactions, and refunds.

## Features

- **10 MCP Tools**: Complete coverage of Woovi API operations (charges, customers, transactions, refunds)
- **3 MCP Resources**: Balance information, API documentation, webhook schemas
- **3 MCP Prompts**: Daily summaries, customer reports, reconciliation workflows
- **Dual Transport**: stdio (Claude Desktop) and HTTP (remote/multi-tenant) support
- **Type-Safe**: Full TypeScript implementation with Zod schema validation
- **Production-Ready**: Comprehensive test coverage, error handling, and caching

## Installation

```bash
# Install dependencies
pnpm install

# Build both packages
pnpm build
```

## Configuration

Create a `.env` file in the project root:

```env
# Required: Your Woovi/OpenPix App ID
WOOVI_APP_ID=your-app-id-here

# Optional: Woovi API base URL (defaults to production)
WOOVI_API_URL=https://api.woovi.com

# Optional: HTTP server port (defaults to 3000)
PORT=3000
```

Get your App ID from the [Woovi Dashboard](https://app.openpix.com.br/).

## Usage

### Stdio Transport (Claude Desktop)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "woovi": {
      "command": "node",
      "args": ["/path/to/mcp-woovi-server-ts/packages/server/dist/stdio.js"],
      "env": {
        "WOOVI_APP_ID": "your-app-id-here"
      }
    }
  }
}
```

Restart Claude Desktop. The Woovi tools will now be available.

### HTTP Transport (Remote/Multi-tenant)

Start the HTTP server:

```bash
export WOOVI_APP_ID="your-app-id"
node packages/server/dist/http.js
```

The server listens on port 3000 (or `$PORT`) and accepts MCP requests at `POST /mcp`.

## Example Conversation

**User:** "I need to create a Pix charge for R$ 50.00 for customer João Silva (joao@example.com)"

**AI Assistant:** I'll create a charge for you.

*Calls `create_charge` tool with:*
```json
{
  "value": 5000,
  "correlationID": "unique-uuid-here",
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

**Result:** Charge created successfully with:
- QR Code (Base64 image)
- Pix copy-paste code (brCode)
- Payment link
- Charge ID and correlation ID

**User:** "What's my current account balance?"

**AI Assistant:** Let me check that for you.

*Calls `get_balance` tool*

**Result:** Your current balance is R$ 1,250.00 (125000 centavos).

## Available Tools

See [TOOLS.md](TOOLS.md) for the complete tool catalog with input schemas and descriptions.

Quick reference:
- **Charges**: `create_charge`, `get_charge`, `list_charges`
- **Customers**: `create_customer`, `get_customer`, `list_customers`
- **Transactions**: `get_transactions`, `get_balance`
- **Refunds**: `create_refund`, `get_refund`

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture, data flow, and package structure.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Build packages
pnpm build

# Watch mode (development)
pnpm dev
```

## Project Structure

```
mcp-woovi-server-ts/
├── packages/
│   ├── client/          # @woovi/client - Pure API client
│   │   └── src/
│   │       ├── types.ts
│   │       ├── cache.ts
│   │       └── client.ts
│   └── server/          # @woovi/server - MCP server
│       ├── src/
│       │   ├── server.ts
│       │   ├── stdio.ts
│       │   ├── http.ts
│       │   ├── tools/
│       │   ├── resources/
│       │   └── prompts/
│       └── tests/
│           └── integration/
└── README.md
```

## Important Notes

- **Value Fields**: Always specified in centavos (5000 = R$ 50.00)
- **CPF/CNPJ**: Automatically detected based on length (11 digits = CPF, 14 digits = CNPJ)
- **Caching**: Balance and customer lookups are cached for 60 seconds
- **Rate Limiting**: Automatic exponential backoff on 429 (Too Many Requests) errors
- **Authorization**: Uses plain `Authorization: ${appId}` header (no "Bearer" prefix)

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: All WooviClient methods, cache, and MCP tools/resources/prompts
- **Integration Tests**: Full MCP server stack with in-process client
- **Test Coverage**: 99/99 client tests, 85/85 server tests passing

Run tests:
```bash
pnpm test
```

## License

MIT

## Support

For Woovi API documentation, visit [developers.openpix.com.br](https://developers.openpix.com.br/).

For MCP protocol documentation, visit [modelcontextprotocol.io](https://modelcontextprotocol.io/).
