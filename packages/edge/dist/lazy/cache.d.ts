export declare class ModuleCache<T = unknown> {
    private readonly capacity;
    private readonly data;
    constructor(capacity?: number);
    get(name: string): T | undefined;
    set(name: string, value: T): void;
    has(name: string): boolean;
    delete(name: string): boolean;
    clear(): void;
    size(): number;
    private evictLeastRecentlyUsed;
}
//# sourceMappingURL=cache.d.ts.map