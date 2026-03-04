import { EdgeRuntime } from "./runtime.js";
import type { EdgeRuntimeConfig } from "./types.js";
export declare function loadConfig(partial?: Partial<EdgeRuntimeConfig>): Promise<EdgeRuntimeConfig>;
export declare function initModules(runtime: EdgeRuntime): Promise<void>;
export declare function startServices(runtime: EdgeRuntime): Promise<void>;
export declare function bootstrap(config?: Partial<EdgeRuntimeConfig>): Promise<EdgeRuntime>;
//# sourceMappingURL=bootstrap.d.ts.map