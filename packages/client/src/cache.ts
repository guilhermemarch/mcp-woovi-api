interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();

  set(key: K, value: V, ttl: number): void {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
  }

  get(key: K): V | null {
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

  clear(): void {
    this.store.clear();
  }
}
