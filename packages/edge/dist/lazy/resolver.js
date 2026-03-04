export class ModuleResolver {
    entries = new Map();
    register(name, importer, metadata) {
        this.entries.set(name, {
            importer,
            metadata: {
                name,
                critical: metadata?.critical ?? false,
                warmup: metadata?.warmup ?? false,
                tags: metadata?.tags ?? [],
            },
        });
    }
    resolve(name) {
        const entry = this.entries.get(name);
        if (!entry) {
            throw new Error(`Module not registered: ${name}`);
        }
        return entry;
    }
    exists(name) {
        return this.entries.has(name);
    }
    getMetadata(name) {
        return this.entries.get(name)?.metadata;
    }
    list() {
        return Array.from(this.entries.keys());
    }
}
//# sourceMappingURL=resolver.js.map