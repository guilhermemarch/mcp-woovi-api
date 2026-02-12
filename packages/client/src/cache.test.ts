import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleCache } from './cache';

describe('SimpleCache', () => {
  let cache: SimpleCache<string, string>;

  beforeEach(() => {
    cache = new SimpleCache();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1', 60000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key1', 'value2', 60000);
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('TTL expiry', () => {
    it('should return null for expired entries', () => {
      cache.set('key1', 'value1', 5000); // 5 second TTL
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(5001);
      expect(cache.get('key1')).toBeNull();
    });

    it('should still return value before expiry', () => {
      cache.set('key1', 'value1', 10000); // 10 second TTL
      vi.advanceTimersByTime(5000); // advance 5 seconds

      expect(cache.get('key1')).toBe('value1');
    });

    it('should expire at exact TTL time', () => {
      cache.set('key1', 'value1', 5000);
      vi.advanceTimersByTime(4999);
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1);
      expect(cache.get('key1')).toBeNull();
    });

    it('should support different TTL values per key', () => {
      cache.set('fast', 'expires-soon', 2000); // 2 seconds
      cache.set('slow', 'expires-later', 10000); // 10 seconds

      vi.advanceTimersByTime(3000);
      expect(cache.get('fast')).toBeNull();
      expect(cache.get('slow')).toBe('expires-later');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);
      cache.set('key3', 'value3', 60000);

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should work on empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });

    it('should allow re-adding entries after clear', () => {
      cache.set('key1', 'value1', 60000);
      cache.clear();
      cache.set('key1', 'value2', 60000);

      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('Generics', () => {
    it('should work with number values', () => {
      const numCache = new SimpleCache<string, number>();
      numCache.set('count', 42, 60000);
      expect(numCache.get('count')).toBe(42);
    });

    it('should work with object values', () => {
      interface User {
        id: number;
        name: string;
      }
      const objCache = new SimpleCache<string, User>();
      const user: User = { id: 1, name: 'John' };
      objCache.set('user1', user, 60000);

      const retrieved = objCache.get('user1');
      expect(retrieved).toEqual(user);
      expect(retrieved?.name).toBe('John');
    });
  });

  describe('Cache TTL use cases', () => {
    it('should cache balance for 60 seconds', () => {
      const balance = { available: 10000, pending: 2000 };
      cache.set('balance', JSON.stringify(balance), 60000);

      expect(cache.get('balance')).toBe(JSON.stringify(balance));

      vi.advanceTimersByTime(59000);
      expect(cache.get('balance')).toBe(JSON.stringify(balance));

      vi.advanceTimersByTime(1001);
      expect(cache.get('balance')).toBeNull();
    });

    it('should cache customer lookup for 60 seconds', () => {
      const customer = { id: 'cust-1', name: 'John Doe', email: 'john@example.com' };
      cache.set('customer:cust-1', JSON.stringify(customer), 60000);

      expect(cache.get('customer:cust-1')).toBe(JSON.stringify(customer));

      vi.advanceTimersByTime(60001);
      expect(cache.get('customer:cust-1')).toBeNull();
    });
  });

  describe('Multiple independent entries', () => {
    it('should maintain separate expiry for each key', () => {
      cache.set('key1', 'value1', 3000);
      cache.set('key2', 'value2', 5000);

      vi.advanceTimersByTime(3500);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');

      vi.advanceTimersByTime(2000);
      expect(cache.get('key2')).toBeNull();
    });
  });
});
