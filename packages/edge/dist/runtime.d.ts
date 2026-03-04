import { MinimalAgent } from "./minimal-agent.js";
import { LiteGateway } from "./lite-gateway.js";
import type { EdgeRuntimeConfig, ResourceUsage } from "./types.js";
export declare class EdgeRuntime {
    private readonly config;
    private readonly modules;
    private readonly startedAt;
    private readonly agent;
    private readonly gateway;
    private bootstrapped;
    constructor(config: EdgeRuntimeConfig);
    bootstrap(): Promise<void>;
    registerCoreModules(): void;
    startAgent(): Promise<void>;
    shutdown(): Promise<void>;
    getResourceUsage(): ResourceUsage;
    getConfig(): EdgeRuntimeConfig;
    isBootstrapped(): boolean;
    getGateway(): LiteGateway;
    getAgent(): MinimalAgent;
    private registerDefaultRoutes;
}
//# sourceMappingURL=runtime.d.ts.map