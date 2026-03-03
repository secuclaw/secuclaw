import type { EdgeModule } from "./types.js";

type ModuleFactory = () => Promise<EdgeModule>;

class NoopModule implements EdgeModule {
  constructor(public readonly id: string, public readonly critical: boolean = false) {}

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

const registry = new Map<string, ModuleFactory>();

// Keep the default module set intentionally small for edge startup.
registry.set("health-check", async () => new NoopModule("health-check", true));
registry.set("config-sync", async () => new NoopModule("config-sync", false));
registry.set("alert-forwarder", async () => new NoopModule("alert-forwarder", false));
registry.set("scan-lite", async () => new NoopModule("scan-lite", false));
registry.set("log-analysis", async () => new NoopModule("log-analysis", false));

export function registerCoreModule(id: string, factory: ModuleFactory): void {
  registry.set(id, factory);
}

export function hasCoreModule(id: string): boolean {
  return registry.has(id);
}

export async function loadCoreModule(id: string): Promise<EdgeModule> {
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(`Unknown core module: ${id}`);
  }
  return factory();
}

export function listCoreModules(): string[] {
  return Array.from(registry.keys());
}
