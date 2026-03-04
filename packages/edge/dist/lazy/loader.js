import { ModuleCache } from "./cache.js";
import { PreloadStrategy } from "./preload.js";
import { ModuleResolver } from "./resolver.js";
export class LazyLoader {
    cache;
    resolver;
    preloadStrategy;
    loading = new Map();
    constructor(options) {
        this.cache = options?.cache ?? new ModuleCache(100);
        this.resolver = options?.resolver ?? new ModuleResolver();
        this.preloadStrategy = options?.preloadStrategy ?? new PreloadStrategy();
    }
    getResolver() {
        return this.resolver;
    }
    async load(moduleName) {
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
        }
        finally {
            this.loading.delete(moduleName);
        }
    }
    async preload(modules) {
        const queue = this.preloadStrategy.schedule(modules);
        await this.preloadStrategy.execute(queue, (name) => this.load(name));
    }
    unload(moduleName) {
        this.cache.delete(moduleName);
    }
    isLoaded(moduleName) {
        return this.cache.has(moduleName);
    }
    async preloadWarmup() {
        const warmups = this.preloadStrategy.warmupCandidates(this.resolver);
        await this.preload(warmups);
    }
    async doLoad(moduleName) {
        const { importer } = this.resolver.resolve(moduleName);
        return importer();
    }
}
//# sourceMappingURL=loader.js.map