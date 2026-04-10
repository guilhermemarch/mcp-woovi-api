import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readJson(relativePath: string) {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), 'utf8'),
  );
}

describe('Postman deliverables', () => {
  it('should provide environment values for every woovi-api collection variable', () => {
    const collection = readJson('../../../../../docs/postman/woovi-api.postman_collection.json');
    const environment = readJson('../../../../../docs/postman/woovi-api.postman_environment.json');

    const collectionKeys = new Set((collection.variable ?? []).map((entry: { key: string }) => entry.key));
    const environmentKeys = new Set((environment.values ?? []).map((entry: { key: string }) => entry.key));

    expect([...collectionKeys].every((key) => environmentKeys.has(key))).toBe(true);
  });
});
