// Simple cache utility for non-Prisma data
// Uses in-memory Map for caching (can be replaced with Redis later)

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    return entry.data;
  }

  /**
   * Set value in cache (infinite TTL - no expiration)
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const cache = new SimpleCache();
