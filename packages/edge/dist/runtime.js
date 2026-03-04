import { listCoreModules, loadCoreModule } from "./core-modules.js";
import { MinimalAgent } from "./minimal-agent.js";
import { LiteGateway } from "./lite-gateway.js";
const MB = 1024 * 1024;
export class EdgeRuntime {
    config;
    modules = new Map();
    startedAt = Date.now();
    agent = new MinimalAgent();
    gateway = new LiteGateway();
    bootstrapped = false;
    constructor(config) {
        this.config = config;
    }
    async bootstrap() {
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    registerCoreModules() {
        for (const id of listCoreModules()) {
            if (!this.modules.has(id)) {
                void loadCoreModule(id).then((mod) => {
                    this.modules.set(id, mod);
                });
            }
        }
    }
    async startAgent() {
        await this.agent.start();
    }
    async shutdown() {
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
    getResourceUsage() {
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
    getConfig() {
        return { ...this.config };
    }
    isBootstrapped() {
        return this.bootstrapped;
    }
    getGateway() {
        return this.gateway;
    }
    getAgent() {
        return this.agent;
    }
    registerDefaultRoutes() {
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
//# sourceMappingURL=runtime.js.map