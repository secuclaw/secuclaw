import type { EdgeModule } from "./types.js";
type ModuleFactory = () => Promise<EdgeModule>;
export declare function registerCoreModule(id: string, factory: ModuleFactory): void;
export declare function hasCoreModule(id: string): boolean;
export declare function loadCoreModule(id: string): Promise<EdgeModule>;
export declare function listCoreModules(): string[];
export {};
//# sourceMappingURL=core-modules.d.ts.map