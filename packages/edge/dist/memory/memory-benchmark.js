import { MemoryOptimizer } from "./optimizer.js";
export async function runMemoryBenchmark(iterations = 20) {
    const optimizer = new MemoryOptimizer();
    const rssValues = [];
    let gcTriggered = 0;
    for (let i = 0; i < iterations; i += 1) {
        const result = optimizer.triggerOptimization();
        rssValues.push(result.afterRssMb);
        if (result.gcTriggered) {
            gcTriggered += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const avgRssMb = rssValues.reduce((sum, v) => sum + v, 0) / Math.max(1, rssValues.length);
    return { iterations, avgRssMb, gcTriggered };
}
//# sourceMappingURL=memory-benchmark.js.map