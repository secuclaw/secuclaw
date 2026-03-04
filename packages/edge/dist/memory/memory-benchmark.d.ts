export interface MemoryBenchmarkResult {
    iterations: number;
    avgRssMb: number;
    gcTriggered: number;
}
export declare function runMemoryBenchmark(iterations?: number): Promise<MemoryBenchmarkResult>;
//# sourceMappingURL=memory-benchmark.d.ts.map