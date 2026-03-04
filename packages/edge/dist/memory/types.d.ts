export interface MemoryUsageSample {
    timestamp: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
}
export interface MemoryStats {
    peakRssMb: number;
    avgRssMb: number;
    gcRuns: number;
    leakSuspected: boolean;
    samples: number;
}
export interface OptimizationResult {
    beforeRssMb: number;
    afterRssMb: number;
    reclaimedMb: number;
    gcTriggered: boolean;
}
export interface LeakReport {
    suspected: boolean;
    tracked: number;
    unresolved: number;
    details: string[];
}
//# sourceMappingURL=types.d.ts.map