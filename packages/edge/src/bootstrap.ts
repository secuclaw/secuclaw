import { EdgeRuntime } from "./runtime.js";
import type { EdgeRuntimeConfig } from "./types.js";

export async function loadConfig(partial: Partial<EdgeRuntimeConfig> = {}): Promise<EdgeRuntimeConfig> {
  return {
    nodeEnv: (process.env.NODE_ENV as EdgeRuntimeConfig["nodeEnv"]) ?? "production",
    enableGateway: partial.enableGateway ?? true,
    enableHealthCheck: partial.enableHealthCheck ?? true,
    enableConfigSync: partial.enableConfigSync ?? true,
    preloadModules: partial.preloadModules ?? ["health-check"],
    memoryLimitMb: partial.memoryLimitMb ?? 20,
    startupTimeoutMs: partial.startupTimeoutMs ?? 100,
  };
}

export async function initModules(runtime: EdgeRuntime): Promise<void> {
  runtime.registerCoreModules();
}

export async function startServices(runtime: EdgeRuntime): Promise<void> {
  await runtime.startAgent();
}

export async function bootstrap(config: Partial<EdgeRuntimeConfig> = {}): Promise<EdgeRuntime> {
  const loaded = await loadConfig(config);
  const runtime = new EdgeRuntime(loaded);
  await runtime.bootstrap();
  await initModules(runtime);
  await startServices(runtime);
  return runtime;
}
