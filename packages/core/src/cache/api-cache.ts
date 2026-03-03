interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

interface CacheOptions {
  ttl?: number;
  staleWhileRevalidate?: boolean;
  tags?: string[];
}

const DEFAULT_TTL = 5 * 60 * 1000;

class ApiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);

    if (options.tags) {
      for (const tag of options.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      if (options.staleWhileRevalidate) {
        this.revalidate(key, fetcher, options);
      }
      return cached;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = fetcher().then((data) => {
      this.set(key, data, options);
      this.pendingRequests.delete(key);
      return data;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  private revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): void {
    fetcher()
      .then((data) => {
        this.set(key, data, options);
      })
      .catch(() => {
        // Silently fail background revalidation
      });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.tagIndex.delete(tag);
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.tagIndex.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiCache = new ApiCache();

export function createCachedApiHook<T, P extends unknown[]>(
  cacheKeyFn: (...args: P) => string,
  fetcher: (...args: P) => Promise<T>,
  options: CacheOptions = {}
) {
  return async (...args: P): Promise<T> => {
    const key = cacheKeyFn(...args);
    return apiCache.getOrFetch(key, () => fetcher(...args), options);
  };
}
