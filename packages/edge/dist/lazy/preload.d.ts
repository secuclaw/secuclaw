import { ModuleResolver } from "./resolver.js";
export declare class PreloadStrategy {
    private readonly hitCounter;
    markAccess(moduleName: string): void;
    predict(limit?: number): string[];
    schedule(modules: string[]): string[];
    execute(modules: string[], loader: (name: string) => Promise<unknown>): Promise<void>;
    warmupCandidates(resolver: ModuleResolver): string[];
}
//# sourceMappingURL=preload.d.ts.map