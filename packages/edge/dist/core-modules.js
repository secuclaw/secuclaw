class NoopModule {
    id;
    critical;
    constructor(id, critical = false) {
        this.id = id;
        this.critical = critical;
    }
    async initialize() { }
    async shutdown() { }
}
const registry = new Map();
// Keep the default module set intentionally small for edge startup.
registry.set("health-check", async () => new NoopModule("health-check", true));
registry.set("config-sync", async () => new NoopModule("config-sync", false));
registry.set("alert-forwarder", async () => new NoopModule("alert-forwarder", false));
registry.set("scan-lite", async () => new NoopModule("scan-lite", false));
registry.set("log-analysis", async () => new NoopModule("log-analysis", false));
export function registerCoreModule(id, factory) {
    registry.set(id, factory);
}
export function hasCoreModule(id) {
    return registry.has(id);
}
export async function loadCoreModule(id) {
    const factory = registry.get(id);
    if (!factory) {
        throw new Error(`Unknown core module: ${id}`);
    }
    return factory();
}
export function listCoreModules() {
    return Array.from(registry.keys());
}
//# sourceMappingURL=core-modules.js.map