export class ResponseCache {
    ttlMs;
    maxEntries;
    cache = new Map();
    constructor(ttlMs = 30_000, maxEntries = 100) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.body;
    }
    set(key, body) {
        this.cache.set(key, {
            body,
            expiresAt: Date.now() + this.ttlMs,
        });
        if (this.cache.size > this.maxEntries) {
            const first = this.cache.keys().next().value;
            if (first) {
                this.cache.delete(first);
            }
        }
    }
    invalidate(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
//# sourceMappingURL=cache.js.map