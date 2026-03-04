import type { MemoryStats } from "./types.js";
export declare class MemoryMonitor {
    private readonly samples;
    private timer;
    private readonly leakDetector;
    startMonitoring(intervalMs?: number): void;
    stopMonitoring(): void;
    detectLeak(maxAgeMs?: number): boolean;
    trackObject(target: object, hint: string): string;
    getStats(): MemoryStats;
    private currentSample;
}
//# sourceMappingURL=monitor.d.ts.map