import { EdgeRuntime } from "./runtime.js";
export async function loadConfig(partial = {}) {
    return {
        nodeEnv: process.env.NODE_ENV ?? "production",
        enableGateway: partial.enableGateway ?? true,
        enableHealthCheck: partial.enableHealthCheck ?? true,
        enableConfigSync: partial.enableConfigSync ?? true,
        preloadModules: partial.preloadModules ?? ["health-check"],
        memoryLimitMb: partial.memoryLimitMb ?? 20,
        startupTimeoutMs: partial.startupTimeoutMs ?? 100,
    };
}
export async function initModules(runtime) {
    runtime.registerCoreModules();
}
export async function startServices(runtime) {
    await runtime.startAgent();
}
export async function bootstrap(config = {}) {
    const loaded = await loadConfig(config);
    const runtime = new EdgeRuntime(loaded);
    await runtime.bootstrap();
    await initModules(runtime);
    await startServices(runtime);
    return runtime;
}
//# sourceMappingURL=bootstrap.js.map