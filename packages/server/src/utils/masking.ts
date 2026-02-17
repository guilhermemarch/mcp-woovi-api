/**
 * Masks sensitive data in API responses before returning to AI assistants.
 * Prevents exposure of PII (tax IDs, phone numbers) through MCP tool responses.
 */

export function maskTaxID(value: string): string {
    if (!value || value.length <= 4) return value;
    const visible = value.slice(-4);
    return '*'.repeat(value.length - 4) + visible;
}

export function maskPhone(value: string): string {
    if (!value || value.length <= 4) return value;
    const visible = value.slice(-4);
    return '*'.repeat(value.length - 4) + visible;
}

/**
 * Deep-clone an object and mask sensitive fields (taxID, phone) in the result.
 * Handles nested objects and arrays recursively.
 */
export function maskSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item));
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (key === 'taxID' && typeof value === 'string') {
            result[key] = maskTaxID(value);
        } else if (key === 'taxID' && typeof value === 'object' && value !== null) {
            // Handle structured taxID: { taxID: string, type: string }
            const taxObj = value as Record<string, unknown>;
            result[key] = {
                ...taxObj,
                ...(typeof taxObj['taxID'] === 'string' ? { taxID: maskTaxID(taxObj['taxID'] as string) } : {}),
            };
        } else if (key === 'phone' && typeof value === 'string') {
            result[key] = maskPhone(value);
        } else if (typeof value === 'object') {
            result[key] = maskSensitiveData(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}
