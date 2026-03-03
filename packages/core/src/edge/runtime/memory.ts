/**
 * Memory Optimizer for Edge Runtime
 * Provides memory management and optimization utilities
 */

import type { MemoryStats } from "../types.js";

export interface MemoryOptimizerConfig {
  /** GC trigger threshold (0-1) */
  gcThreshold: number;
  /** Enable object pooling */
  objectPooling: boolean;
  /** Max pool size per type */
  maxPoolSize: number;
  /** Enable memory tracking */
  tracking: boolean;
}

const DEFAULT_OPTIMIZER_CONFIG: MemoryOptimizerConfig = {
  gcThreshold: 0.85,
  objectPooling: true,
  maxPoolSize: 100,
  tracking: true,
};

/**
 * Object pool for memory efficiency
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  get size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Memory Optimizer
 */
export class MemoryOptimizer {
  private config: MemoryOptimizerConfig;
  private pools: Map<string, ObjectPool<unknown>> = new Map();
  private allocations: Map<string, number> = new Map();
  private lastGCTime = 0;

  constructor(config: Partial<MemoryOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
  }

  /**
   * Create or get an object pool
   */
  getPool<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void
  ): ObjectPool<T> {
    if (!this.config.objectPooling) {
      // Create a non-pooling implementation
      const dummyPool = {
        acquire: factory,
        release: () => {},
        size: 0,
        clear: () => {},
      } as unknown as ObjectPool<T>;
      return dummyPool;
    }

    let pool = this.pools.get(name) as ObjectPool<T> | undefined;
    if (!pool) {
      pool = new ObjectPool(factory, reset, this.config.maxPoolSize);
      this.pools.set(name, pool as ObjectPool<unknown>);
    }
    return pool;
  }

  /**
   * Track memory allocation
   */
  trackAllocation(name: string, size: number): void {
    if (!this.config.tracking) return;
    const current = this.allocations.get(name) || 0;
    this.allocations.set(name, current + size);
  }

  /**
   * Track memory deallocation
   */
  trackDeallocation(name: string, size: number): void {
    if (!this.config.tracking) return;
    const current = this.allocations.get(name) || 0;
    this.allocations.set(name, Math.max(0, current - size));
  }

  /**
   * Get allocation stats
   */
  getAllocationStats(): Map<string, number> {
    return new Map(this.allocations);
  }

  /**
   * Check if GC should be triggered
   */
  shouldTriggerGC(): boolean {
    const memory = this.getMemoryStats();
    return memory.usagePercent > this.config.gcThreshold * 100;
  }

  /**
   * Get memory stats
   */
  getMemoryStats(): MemoryStats {
    const mem = process.memoryUsage();
    return {
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      usagePercent: (mem.heapUsed / mem.heapTotal) * 100,
    };
  }

  /**
   * Trigger garbage collection (if available)
   */
  triggerGC(): boolean {
    if (global.gc && typeof global.gc === "function") {
      const before = this.getMemoryStats().heapUsed;
      global.gc();
      const after = this.getMemoryStats().heapUsed;
      this.lastGCTime = Date.now();
      return after < before;
    }
    return false;
  }

  /**
   * Optimize memory by clearing pools and triggering GC
   */
  optimize(): { clearedPools: number; gcTriggered: boolean } {
    // Clear all pools
    let clearedPools = 0;
    for (const pool of this.pools.values()) {
      if (pool.size > 0) {
        pool.clear();
        clearedPools++;
      }
    }

    // Trigger GC if threshold exceeded
    const gcTriggered = this.shouldTriggerGC() && this.triggerGC();

    return { clearedPools, gcTriggered };
  }

  /**
   * Get optimizer stats
   */
  getStats(): {
    pools: number;
    totalPooled: number;
    allocations: number;
    lastGC: number;
  } {
    let totalPooled = 0;
    for (const pool of this.pools.values()) {
      totalPooled += pool.size;
    }

    return {
      pools: this.pools.size,
      totalPooled,
      allocations: this.allocations.size,
      lastGC: this.lastGCTime,
    };
  }
}

/**
 * Create memory optimizer instance
 */
export function createMemoryOptimizer(
  config?: Partial<MemoryOptimizerConfig>
): MemoryOptimizer {
  return new MemoryOptimizer(config);
}
