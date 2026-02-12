export class SimpleCache {
    constructor() {
        this.store = new Map();
    }
    set(key, value, ttl) {
        const expiresAt = Date.now() + ttl;
        this.store.set(key, { value, expiresAt });
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    clear() {
        this.store.clear();
    }
}
//# sourceMappingURL=cache.js.map