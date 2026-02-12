export declare class SimpleCache<K, V> {
    private store;
    set(key: K, value: V, ttl: number): void;
    get(key: K): V | null;
    clear(): void;
}
//# sourceMappingURL=cache.d.ts.map