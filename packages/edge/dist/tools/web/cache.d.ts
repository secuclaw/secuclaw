export declare class ResponseCache {
    private readonly ttlMs;
    private readonly maxEntries;
    private readonly cache;
    constructor(ttlMs?: number, maxEntries?: number);
    get(key: string): string | undefined;
    set(key: string, body: string): void;
    invalidate(key: string): void;
    clear(): void;
}
//# sourceMappingURL=cache.d.ts.map