import type { MemoryUsageSample, OptimizationResult } from "./types.js";
export declare class MemoryOptimizer {
    private limitMb;
    private readonly gcHints;
    private readonly monitor;
    optimize(): OptimizationResult;
    setLimit(limit: number): void;
    getUsage(): MemoryUsageSample;
    triggerOptimization(): OptimizationResult;
    startMonitoring(intervalMs?: number): void;
    stopMonitoring(): void;
}
//# sourceMappingURL=optimizer.d.ts.map