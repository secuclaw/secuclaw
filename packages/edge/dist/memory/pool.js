export class ObjectPool {
    factory;
    reset;
    maxSize;
    pool = [];
    constructor(factory, reset, maxSize = 128) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;
    }
    acquire() {
        const instance = this.pool.pop();
        return instance ?? this.factory();
    }
    release(value) {
        this.reset(value);
        if (this.pool.length < this.maxSize) {
            this.pool.push(value);
        }
    }
    drain() {
        this.pool.length = 0;
    }
    size() {
        return this.pool.length;
    }
}
//# sourceMappingURL=pool.js.map