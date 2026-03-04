export class PreloadStrategy {
    hitCounter = new Map();
    markAccess(moduleName) {
        const current = this.hitCounter.get(moduleName) ?? 0;
        this.hitCounter.set(moduleName, current + 1);
    }
    predict(limit = 3) {
        return Array.from(this.hitCounter.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name]) => name);
    }
    schedule(modules) {
        return [...new Set(modules)];
    }
    async execute(modules, loader) {
        await Promise.all(modules.map((m) => loader(m).catch(() => undefined)));
    }
    warmupCandidates(resolver) {
        return resolver
            .list()
            .filter((name) => resolver.getMetadata(name)?.warmup ?? false);
    }
}
//# sourceMappingURL=preload.js.map