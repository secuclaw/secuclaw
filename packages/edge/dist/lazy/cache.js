export class ModuleCache {
    capacity;
    data = new Map();
    constructor(capacity = 100) {
        this.capacity = capacity;
    }
    get(name) {
        const existing = this.data.get(name);
        if (!existing) {
            return undefined;
        }
        existing.usedAt = Date.now();
        this.data.set(name, existing);
        return existing.value;
    }
    set(name, value) {
        this.data.set(name, {
            value,
            usedAt: Date.now(),
        });
        if (this.data.size > this.capacity) {
            this.evictLeastRecentlyUsed();
        }
    }
    has(name) {
        return this.data.has(name);
    }
    delete(name) {
        return this.data.delete(name);
    }
    clear() {
        this.data.clear();
    }
    size() {
        return this.data.size;
    }
    evictLeastRecentlyUsed() {
        let oldestKey;
        let oldestTs = Number.POSITIVE_INFINITY;
        for (const [key, entry] of this.data) {
            if (entry.usedAt < oldestTs) {
                oldestTs = entry.usedAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.data.delete(oldestKey);
        }
    }
}
//# sourceMappingURL=cache.js.map