import { listCoreModules, loadCoreModule } from "./core-modules.js";
import { MinimalAgent } from "./minimal-agent.js";
import { LiteGateway } from "./lite-gateway.js";
import type { EdgeRuntimeConfig, EdgeModule, ResourceUsage } from "./types.js";

const MB = 1024 * 1024;

export class EdgeRuntime {
  private readonly modules = new Map<string, EdgeModule>();
  private readonly startedAt = Date.now();
  private readonly agent = new MinimalAgent();
  private readonly gateway = new LiteGateway();
  private bootstrapped = false;

  constructor(private readonly config: EdgeRuntimeConfig) {}

  async bootstrap(): Promise<void> {
    const timeoutId = setTimeout(() => {
      throw new Error("edge runtime bootstrap timeout");
    }, this.config.startupTimeoutMs);

    try {
      for (const moduleId of this.config.preloadModules) {
        const mod = await loadCoreModule(moduleId);
        await mod.initialize();
        this.modules.set(mod.id, mod);
      }

      if (this.config.enableGateway) {
        this.registerDefaultRoutes();
        await this.gateway.start();
      }

      this.bootstrapped = true;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  registerCoreModules(): void {
    for (const id of listCoreModules()) {
      if (!this.modules.has(id)) {
        void loadCoreModule(id).then((mod) => {
          this.modules.set(id, mod);
        });
      }
    }
  }

  async startAgent(): Promise<void> {
    await this.agent.start();
  }

  async shutdown(): Promise<void> {
    await this.agent.stop();

    for (const module of this.modules.values()) {
      await module.shutdown();
    }
    this.modules.clear();

    if (this.gateway.isStarted()) {
      await this.gateway.stop();
    }

    this.bootstrapped = false;
  }

  getResourceUsage(): ResourceUsage {
    const usage = process.memoryUsage();
    return {
      rssMb: usage.rss / MB,
      heapTotalMb: usage.heapTotal / MB,
      heapUsedMb: usage.heapUsed / MB,
      externalMb: usage.external / MB,
      arrayBuffersMb: usage.arrayBuffers / MB,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  getConfig(): EdgeRuntimeConfig {
    return { ...this.config };
  }

  isBootstrapped(): boolean {
    return this.bootstrapped;
  }

  getGateway(): LiteGateway {
    return this.gateway;
  }

  getAgent(): MinimalAgent {
    return this.agent;
  }

  private registerDefaultRoutes(): void {
    this.gateway.register("/health", "GET", async () => ({
      status: 200,
      body: {
        status: "ok",
        bootstrapped: this.bootstrapped,
        modules: Array.from(this.modules.keys()),
      },
    }));

    this.gateway.register("/resource", "GET", async () => ({
      status: 200,
      body: this.getResourceUsage(),
    }));
  }
}
