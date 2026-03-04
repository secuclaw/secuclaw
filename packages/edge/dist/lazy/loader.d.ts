import { ModuleCache } from "./cache.js";
import { PreloadStrategy } from "./preload.js";
import { ModuleResolver } from "./resolver.js";
export declare class LazyLoader {
    private readonly cache;
    private readonly resolver;
    private readonly preloadStrategy;
    private readonly loading;
    constructor(options?: {
        cache?: ModuleCache<unknown>;
        resolver?: ModuleResolver;
        preloadStrategy?: PreloadStrategy;
    });
    getResolver(): ModuleResolver;
    load(moduleName: string): Promise<unknown>;
    preload(modules: string[]): Promise<void>;
    unload(moduleName: string): void;
    isLoaded(moduleName: string): boolean;
    preloadWarmup(): Promise<void>;
    private doLoad;
}
//# sourceMappingURL=loader.d.ts.map