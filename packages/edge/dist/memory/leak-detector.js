export class LeakDetector {
    records = new Map();
    counter = 0;
    track(target, hint) {
        const id = `tracked-${Date.now()}-${++this.counter}`;
        this.records.set(target, {
            id,
            hint,
            createdAt: Date.now(),
        });
        return id;
    }
    untrack(target) {
        return this.records.delete(target);
    }
    detect(maxAgeMs = 120_000) {
        const now = Date.now();
        const stale = [];
        for (const entry of this.records.values()) {
            if (now - entry.createdAt >= maxAgeMs) {
                stale.push(`${entry.id}:${entry.hint}`);
            }
        }
        return {
            suspected: stale.length > 0,
            tracked: this.records.size,
            unresolved: stale.length,
            details: stale,
        };
    }
    report(maxAgeMs = 120_000) {
        const r = this.detect(maxAgeMs);
        return JSON.stringify(r);
    }
}
//# sourceMappingURL=leak-detector.js.map