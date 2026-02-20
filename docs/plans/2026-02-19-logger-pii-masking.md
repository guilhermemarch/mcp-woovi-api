# Logger PII Masking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers/executing-plans to implement this plan task-by-task.

**Goal:** Add automatic PII masking to the logger's emit() method so sensitive data (taxID, phone, appId, etc.) is masked before being logged to stderr.

**Architecture:** The logger will import the existing `maskSensitiveData` function from the server package and call it in the `emit()` method before writing to stderr. This prevents sensitive information from being exposed in logs while maintaining all existing logger functionality.

**Tech Stack:** TypeScript, existing maskSensitiveData utility, Node.js stderr

---

## Task 1: Update Logger to Import maskSensitiveData

**Files:**
- Modify: `packages/client/src/logger.ts:1-30`

**Step 1: Import maskSensitiveData in logger.ts**

Add import at the top of `packages/client/src/logger.ts`:

```typescript
import { maskSensitiveData } from '@woovi/server/dist/utils/masking.js';
```

**Note:** The import path uses `@woovi/server` package alias and `.js` extension for ES modules.

**Step 2: Verify import path exists**

Run: `ls -la packages/server/dist/utils/masking.js`
Expected: File exists

**Step 3: Commit**

```bash
git add packages/client/src/logger.ts
git commit -m "feat: add maskSensitiveData import to logger"
```

---

## Task 2: Modify emit() to Call maskSensitiveData

**Files:**
- Modify: `packages/client/src/logger.ts:30-43` (emit method)

**Step 1: Update emit method to mask data**

Replace the `emit()` method (lines 30-43) with:

```typescript
private emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    // Mask sensitive data before logging
    const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        component: this.component,
        message,
        ...maskedData,
    };

    // Always write logs to stderr to avoid interfering with stdio MCP transport
    process.stderr.write(JSON.stringify(entry) + '\n');
}
```

**Step 2: Verify the logger still works locally**

Run: `npm test -w packages/client -- logger.test.ts` (if test exists)

Expected: Tests pass or file doesn't exist (check if logger.test.ts exists first)

**Step 3: Commit**

```bash
git add packages/client/src/logger.ts
git commit -m "feat: mask sensitive data in logger emit method"
```

---

## Task 3: Create Logger Masking Test Suite

**Files:**
- Create: `packages/client/src/logger.test.ts`

**Step 1: Write comprehensive masking tests**

Create `packages/client/src/logger.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

// Capture stderr output
let stderrOutput: string[] = [];
const originalWrite = process.stderr.write;

describe('Logger - PII Masking', () => {
    beforeEach(() => {
        stderrOutput = [];
        process.stderr.write = ((data: any) => {
            stderrOutput.push(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }) as any;
    });

    afterEach(() => {
        process.stderr.write = originalWrite;
    });

    it('masks taxID in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Customer data', { 
            name: 'John',
            taxID: '12345678900'
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.taxID).toBe('*******78900');
        expect(logged.name).toBe('John'); // Non-sensitive data unchanged
    });

    it('masks phone in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Contact info', { 
            email: 'test@example.com',
            phone: '11987654321'
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.phone).toBe('*******4321');
        expect(logged.email).toBe('test@example.com');
    });

    it('masks appId in logged data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Client init', { 
            appId: 'test-app-id-12345',
            baseUrl: 'https://api.woovi.com'
        });

        const logged = JSON.parse(stderrOutput[0]);
        // appId masking depends on maskSensitiveData implementation
        expect(logged.appId).toContain('*');
        expect(logged.baseUrl).toBe('https://api.woovi.com');
    });

    it('masks cpf field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('CPF data', { cpf: '12345678900' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.cpf).toBe('*******78900');
    });

    it('masks cnpj field', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('CNPJ data', { cnpj: '12345678901234' });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.cnpj).toBe('**********1234');
    });

    it('masks nested sensitive data', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Nested data', { 
            customer: {
                name: 'John',
                taxID: '12345678900'
            }
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.customer.taxID).toBe('*******78900');
        expect(logged.customer.name).toBe('John');
    });

    it('masks sensitive data in arrays', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Customer list', { 
            customers: [
                { name: 'John', phone: '11987654321' },
                { name: 'Jane', phone: '11912345678' }
            ]
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.customers[0].phone).toBe('*******4321');
        expect(logged.customers[1].phone).toBe('*******5678');
        expect(logged.customers[0].name).toBe('John');
    });

    it('handles undefined/null data gracefully', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('No data');
        logger.info('Null data', null as any);

        expect(stderrOutput.length >= 1).toBe(true);
        const logged1 = JSON.parse(stderrOutput[0]);
        expect(logged1.level).toBe('info');
    });

    it('does not mask non-sensitive numeric fields', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.info('Transaction', { 
            amount: 5000,
            value: 100.50
        });

        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.amount).toBe(5000);
        expect(logged.value).toBe(100.50);
    });

    it('still writes to stderr', () => {
        const logger = new Logger('TestComponent', 'debug');
        logger.debug('Test message', { taxID: '12345678900' });

        expect(stderrOutput.length).toBeGreaterThan(0);
        const logged = JSON.parse(stderrOutput[0]);
        expect(logged.timestamp).toBeDefined();
        expect(logged.level).toBe('debug');
    });
});
```

**Step 2: Run tests to verify they fail (red)**

Run: `npm test -w packages/client -- logger.test.ts`

Expected: Tests FAIL with "maskSensitiveData is not imported" or similar

**Step 3: Commit test file**

```bash
git add packages/client/src/logger.test.ts
git commit -m "test: add comprehensive logger PII masking tests (red)"
```

---

## Task 4: Update maskSensitiveData to Cover All Sensitive Keys

**Files:**
- Modify: `packages/server/src/utils/masking.ts:22-51` (maskSensitiveData function)

**Background:** Current maskSensitiveData only masks `taxID` and `phone`. We need to extend it to also mask: `appId`, `taxId`, `cpf`, `cnpj`, `phoneNumber`, `telephone`, `mobile`.

**Step 1: Review current masking function structure**

The function already handles:
- String fields (taxID, phone)
- Nested objects
- Arrays

**Step 2: Extend maskSensitiveData to handle all sensitive keys**

Replace the `maskSensitiveData` function (lines 22-51) in `packages/server/src/utils/masking.ts`:

```typescript
/**
 * Deep-clone an object and mask sensitive fields in the result.
 * Sensitive fields: taxID, taxId, phone, phoneNumber, telephone, mobile, appId, cpf, cnpj
 * Handles nested objects and arrays recursively.
 */
export function maskSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item));
    }

    const sensitiveStringFields = ['taxID', 'taxId', 'phone', 'phoneNumber', 'telephone', 'mobile', 'appId', 'cpf', 'cnpj'];

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (sensitiveStringFields.includes(key) && typeof value === 'string') {
            result[key] = maskTaxID(value); // Same masking logic for all string sensitive fields
        } else if (key === 'taxID' && typeof value === 'object' && value !== null) {
            // Handle structured taxID: { taxID: string, type: string }
            const taxObj = value as Record<string, unknown>;
            result[key] = {
                ...taxObj,
                ...(typeof taxObj['taxID'] === 'string' ? { taxID: maskTaxID(taxObj['taxID'] as string) } : {}),
            };
        } else if (typeof value === 'object') {
            result[key] = maskSensitiveData(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}
```

**Step 3: Verify tests pass (green)**

Run: `npm test -w packages/client -- logger.test.ts`

Expected: Tests PASS

**Step 4: Commit**

```bash
git add packages/server/src/utils/masking.ts
git commit -m "feat: extend maskSensitiveData to cover all PII fields (taxId, cpf, cnpj, phoneNumber, telephone, mobile, appId)"
```

---

## Task 5: Verify Build and All Tests Pass

**Files:**
- No changes, verification only

**Step 1: Build both packages**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 2: Run full test suite**

Run: `npm test`

Expected: All tests pass

**Step 3: Verify logger masking works end-to-end**

Run: `npm test -w packages/client -- logger.test.ts`

Expected: All 10+ masking tests pass

**Step 4: Check for type errors**

Run: `npm run typecheck` (if available) or just verify build succeeded

Expected: No type errors

---

## Task 6: Create Integration Test Scenarios

**Files:**
- Create: `/tmp/test-logger-scenarios.ts`

**Step 1: Create comprehensive scenario test file**

Create `/tmp/test-logger-scenarios.ts`:

```typescript
import { Logger } from '/home/guilherme/Desktop/mcp-woovi-server-ts/packages/client/dist/logger.js';

// Test Scenario 1: Customer with taxID
console.log('=== Scenario 1: Customer with taxID ===');
const logger = new Logger('WooviClient', 'debug');
logger.info('Creating customer', {
    name: 'João Silva',
    email: 'joao@example.com',
    taxID: '12345678900',
    phone: '11987654321'
});

// Test Scenario 2: Client initialization with appId
console.log('\n=== Scenario 2: Client initialization with appId ===');
logger.debug('Client initialized', {
    appId: 'app-id-12345-67890',
    baseUrl: 'https://api.woovi.com',
    timeoutMs: 30000
});

// Test Scenario 3: Transaction with cpf and cnpj
console.log('\n=== Scenario 3: Transaction with cpf/cnpj ===');
logger.info('Processing transaction', {
    transactionId: 'tx-123',
    amount: 5000,
    cpf: '12345678900',
    cnpj: '12345678901234'
});

// Test Scenario 4: Request with all phone variations
console.log('\n=== Scenario 4: All phone field variations ===');
logger.debug('Contact information', {
    phone: '11987654321',
    phoneNumber: '11987654321',
    telephone: '1133334444',
    mobile: '11999999999'
});

// Test Scenario 5: Nested sensitive data
console.log('\n=== Scenario 5: Nested sensitive data ===');
logger.info('Customer object', {
    customer: {
        id: 'cust-123',
        name: 'Jane Doe',
        contact: {
            email: 'jane@example.com',
            phone: '11987654321'
        },
        taxId: '98765432100'
    }
});

// Test Scenario 6: Sensitive data should NOT break amounts/values
console.log('\n=== Scenario 6: Non-sensitive numeric fields preserved ===');
logger.info('Charge created', {
    chargeId: 'charge-123',
    value: 5000,
    amount: 100.50,
    taxID: '12345678900'
});

console.log('\n✅ All scenarios logged to stderr (check above for masked values)');
console.log('Expected: taxID, phone variants, cpf, cnpj, appId should be masked');
```

**Step 2: Build the project first**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Run scenario test**

Run: `node /tmp/test-logger-scenarios.ts 2>&1 | tee /tmp/logger-scenarios-output.log`

Expected: Output shows masked PII:
- taxID: `*******78900` or similar
- phone variants: `*******4321` or similar
- cpf: masked
- cnpj: masked
- appId: masked
- Amounts (value, amount): NOT masked

**Step 4: Verify evidence files (if needed)**

Save evidence if required:
```bash
cp /tmp/logger-scenarios-output.log .sisyphus/evidence/task-logger-masking-scenarios.log
```

**Step 5: Commit**

```bash
git add .sisyphus/evidence/
git commit -m "docs: add logger PII masking scenario verification"
```

---

## Verification Checklist

Before claiming completion:

- [ ] Logger imports `maskSensitiveData` from `@woovi/server`
- [ ] `emit()` method calls `maskSensitiveData(data)` before writing to stderr
- [ ] All sensitive keys masked: taxID, taxId, phone, phoneNumber, telephone, mobile, appId, cpf, cnpj
- [ ] Unit tests exist and all pass (10+ tests)
- [ ] Logger still writes to stderr (not stdout)
- [ ] Non-sensitive fields preserved (amounts, values, etc.)
- [ ] Nested objects and arrays handled correctly
- [ ] Build succeeds with no errors
- [ ] Full test suite passes
- [ ] No type errors

---

## Files Modified Summary

1. **packages/client/src/logger.ts**
   - Add import for maskSensitiveData
   - Update emit() method to call maskSensitiveData(data)

2. **packages/server/src/utils/masking.ts**
   - Extend maskSensitiveData to cover all 9 sensitive keys

3. **packages/client/src/logger.test.ts** (NEW)
   - Comprehensive test suite with 10+ test cases

---

## Notes

- The mask function shows last 4 characters: `*******78900` for 11-char taxID
- All sensitive string fields use same masking logic
- Masking is recursive (handles nested objects and arrays)
- Logger API unchanged - backward compatible
- stderr output unchanged in format, only data is masked
