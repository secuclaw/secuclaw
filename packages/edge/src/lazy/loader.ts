import { ModuleCache } from "./cache.js";
import { PreloadStrategy } from "./preload.js";
import { ModuleResolver } from "./resolver.js";

export class LazyLoader {
  private readonly cache: ModuleCache<unknown>;
  private readonly resolver: ModuleResolver;
  private readonly preloadStrategy: PreloadStrategy;
  private readonly loading = new Map<string, Promise<unknown>>();

  constructor(options?: {
    cache?: ModuleCache<unknown>;
    resolver?: ModuleResolver;
    preloadStrategy?: PreloadStrategy;
  }) {
    this.cache = options?.cache ?? new ModuleCache(100);
    this.resolver = options?.resolver ?? new ModuleResolver();
    this.preloadStrategy = options?.preloadStrategy ?? new PreloadStrategy();
  }

  getResolver(): ModuleResolver {
    return this.resolver;
  }

  async load(moduleName: string): Promise<unknown> {
    const cached = this.cache.get(moduleName);
    if (cached !== undefined) {
      this.preloadStrategy.markAccess(moduleName);
      return cached;
    }

    const inFlight = this.loading.get(moduleName);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.doLoad(moduleName);
    this.loading.set(moduleName, promise);

    try {
      const loaded = await promise;
      this.cache.set(moduleName, loaded);
      this.preloadStrategy.markAccess(moduleName);
      return loaded;
    } finally {
      this.loading.delete(moduleName);
    }
  }

  async preload(modules: string[]): Promise<void> {
    const queue = this.preloadStrategy.schedule(modules);
    await this.preloadStrategy.execute(queue, (name) => this.load(name));
  }

  unload(moduleName: string): void {
    this.cache.delete(moduleName);
  }

  isLoaded(moduleName: string): boolean {
    return this.cache.has(moduleName);
  }

  async preloadWarmup(): Promise<void> {
    const warmups = this.preloadStrategy.warmupCandidates(this.resolver);
    await this.preload(warmups);
  }

  private async doLoad(moduleName: string): Promise<unknown> {
    const { importer } = this.resolver.resolve(moduleName);
    return importer();
  }
}
