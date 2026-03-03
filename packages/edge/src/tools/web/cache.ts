interface CacheRecord {
  body: string;
  expiresAt: number;
}

export class ResponseCache {
  private readonly cache = new Map<string, CacheRecord>();

  constructor(
    private readonly ttlMs: number = 30_000,
    private readonly maxEntries: number = 100,
  ) {}

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.body;
  }

  set(key: string, body: string): void {
    this.cache.set(key, {
      body,
      expiresAt: Date.now() + this.ttlMs,
    });

    if (this.cache.size > this.maxEntries) {
      const first = this.cache.keys().next().value;
      if (first) {
        this.cache.delete(first);
      }
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
