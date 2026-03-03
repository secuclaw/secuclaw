import type { CacheEntry } from "./types.js";

export class ModuleCache<T = unknown> {
  private readonly data = new Map<string, CacheEntry<T>>();

  constructor(private readonly capacity: number = 100) {}

  get(name: string): T | undefined {
    const existing = this.data.get(name);
    if (!existing) {
      return undefined;
    }
    existing.usedAt = Date.now();
    this.data.set(name, existing);
    return existing.value;
  }

  set(name: string, value: T): void {
    this.data.set(name, {
      value,
      usedAt: Date.now(),
    });

    if (this.data.size > this.capacity) {
      this.evictLeastRecentlyUsed();
    }
  }

  has(name: string): boolean {
    return this.data.has(name);
  }

  delete(name: string): boolean {
    return this.data.delete(name);
  }

  clear(): void {
    this.data.clear();
  }

  size(): number {
    return this.data.size;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | undefined;
    let oldestTs = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.data) {
      if (entry.usedAt < oldestTs) {
        oldestTs = entry.usedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.data.delete(oldestKey);
    }
  }
}
