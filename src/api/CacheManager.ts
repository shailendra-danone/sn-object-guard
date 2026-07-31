import { CacheEntry } from '../models/types';

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Constructs cache key from instance, table, and sys_id
   */
  private buildKey(instance: string, table: string, sys_id: string): string {
    return `${instance.toLowerCase()}:${table.toLowerCase()}:${sys_id}`;
  }

  /**
   * Gets cached value if present and not expired
   */
  public get<T>(instance: string, table: string, sys_id: string): T | null {
    const key = this.buildKey(instance, table, sys_id);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stores value in cache with specified TTL in seconds
   */
  public set<T>(instance: string, table: string, sys_id: string, data: T, ttlSeconds: number = 300): void {
    const key = this.buildKey(instance, table, sys_id);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000
    });
  }

  /**
   * Clears all cached entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Removes expired items from cache
   */
  public purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  public size(): number {
    return this.cache.size;
  }
}
