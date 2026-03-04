export interface ModuleMetadata {
    name: string;
    critical: boolean;
    warmup: boolean;
    tags: string[];
}
export type ModuleImporter<T = unknown> = () => Promise<T>;
export interface ResolverEntry<T = unknown> {
    importer: ModuleImporter<T>;
    metadata: ModuleMetadata;
}
export interface CacheEntry<T = unknown> {
    value: T;
    usedAt: number;
}
//# sourceMappingURL=types.d.ts.map