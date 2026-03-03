/**
 * Lazy Loading System for Edge Runtime
 * Enables on-demand module loading to minimize memory footprint
 */

import type { EdgeModule } from "../types.js";

export interface LazyLoaderConfig {
  /** Enable preload hints */
  preloadHints: boolean;
  /** Module load timeout in ms */
  loadTimeout: number;
  /** Enable caching */
  caching: boolean;
  /** Max cache size in bytes */
  maxCacheSize: number;
}

const DEFAULT_LAZY_CONFIG: LazyLoaderConfig = {
  preloadHints: true,
  loadTimeout: 30000,
  caching: true,
  maxCacheSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Lazy module wrapper
 */
interface LazyModule<T = unknown> {
  /** Module name */
  name: string;
  /** Factory function */
  factory: () => Promise<T>;
  /** Cached instance */
  instance: T | null;
  /** Load promise (for deduplication) */
  promise: Promise<T> | null;
  /** Is loaded */
  loaded: boolean;
  /** Module size estimate */
  size: number;
}

/**
 * Lazy Loader
 */
export class LazyLoader {
  private config: LazyLoaderConfig;
  private modules: Map<string, LazyModule> = new Map();
  private cacheSize = 0;
  private loadOrder: string[] = [];

  constructor(config: Partial<LazyLoaderConfig> = {}) {
    this.config = { ...DEFAULT_LAZY_CONFIG, ...config };
  }

  /**
   * Register a lazy module
   */
  register<T>(
    name: string,
    factory: () => Promise<T>,
    size = 0
  ): void {
    this.modules.set(name, {
      name,
      factory,
      instance: null,
      promise: null,
      loaded: false,
      size,
    });
  }

  /**
   * Load a module lazily
   */
  async load<T>(name: string): Promise<T> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not registered: ${name}`);
    }

    // Return cached instance
    if (module.loaded && module.instance !== null) {
      return module.instance as T;
    }

    // Deduplicate concurrent loads
    if (module.promise) {
      return module.promise as Promise<T>;
    }

    // Load with timeout
    module.promise = this.loadWithTimeout<T>(module);
    try {
      const result = (await module.promise) as T;
      return result;
    } finally {
      module.promise = null;
    }
  }

  /**
   * Load module with timeout
   */
  private async loadWithTimeout<T>(module: LazyModule): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Module load timeout: ${module.name}`)),
        this.config.loadTimeout
      );
    });

    const instance = await Promise.race([
      module.factory() as Promise<T>,
      timeoutPromise,
    ]);

    // Cache if enabled
    if (this.config.caching) {
      this.evictIfNeeded(module.size);
      module.instance = instance;
      module.loaded = true;
      this.cacheSize += module.size;
      this.loadOrder.push(module.name);
    }

    return instance;
  }

  /**
   * Evict old modules if cache is full
   */
  private evictIfNeeded(newSize: number): void {
    while (
      this.cacheSize + newSize > this.config.maxCacheSize &&
      this.loadOrder.length > 0
    ) {
      const oldest = this.loadOrder.shift()!;
      const oldModule = this.modules.get(oldest);
      if (oldModule && oldModule.loaded) {
        oldModule.instance = null;
        oldModule.loaded = false;
        this.cacheSize -= oldModule.size;
      }
    }
  }

  /**
   * Unload a module
   */
  unload(name: string): boolean {
    const module = this.modules.get(name);
    if (!module || !module.loaded) {
      return false;
    }

    module.instance = null;
    module.loaded = false;
    this.cacheSize -= module.size;

    const index = this.loadOrder.indexOf(name);
    if (index > -1) {
      this.loadOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Check if module is loaded
   */
  isLoaded(name: string): boolean {
    const module = this.modules.get(name);
    return module?.loaded ?? false;
  }

  /**
   * Get module instance (returns null if not loaded)
   */
  get<T>(name: string): T | null {
    const module = this.modules.get(name);
    return (module?.instance as T) ?? null;
  }

  /**
   * Preload modules based on hints
   */
  async preload(names: string[]): Promise<void> {
    await Promise.all(names.map((name) => this.load(name).catch(() => {})));
  }

  /**
   * Get loader stats
   */
  getStats(): {
    registered: number;
    loaded: number;
    cacheSize: number;
    maxCacheSize: number;
  } {
    let loaded = 0;
    for (const module of this.modules.values()) {
      if (module.loaded) loaded++;
    }

    return {
      registered: this.modules.size,
      loaded,
      cacheSize: this.cacheSize,
      maxCacheSize: this.config.maxCacheSize,
    };
  }

  /**
   * Clear all cached modules
   */
  clearCache(): void {
    for (const module of this.modules.values()) {
      module.instance = null;
      module.loaded = false;
    }
    this.cacheSize = 0;
    this.loadOrder = [];
  }
}

/**
 * Create lazy loader instance
 */
export function createLazyLoader(
  config?: Partial<LazyLoaderConfig>
): LazyLoader {
  return new LazyLoader(config);
}

/**
 * Create a lazy module proxy
 */
export function lazy<T>(
  loader: LazyLoader,
  name: string
): Promise<T> & { get: () => Promise<T> } {
  const get = () => loader.load<T>(name);
  const promise = get();
  return Object.assign(promise, { get });
}
