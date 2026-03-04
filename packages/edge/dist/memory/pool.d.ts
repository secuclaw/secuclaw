export declare class ObjectPool<T> {
    private readonly factory;
    private readonly reset;
    private readonly maxSize;
    private readonly pool;
    constructor(factory: () => T, reset: (value: T) => void, maxSize?: number);
    acquire(): T;
    release(value: T): void;
    drain(): void;
    size(): number;
}
//# sourceMappingURL=pool.d.ts.map