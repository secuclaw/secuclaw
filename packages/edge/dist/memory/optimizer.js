import { GCHints } from "./gc-hints.js";
import { MemoryMonitor } from "./monitor.js";
const MB = 1024 * 1024;
function sample() {
    const m = process.memoryUsage();
    return {
        timestamp: Date.now(),
        rssMb: m.rss / MB,
        heapUsedMb: m.heapUsed / MB,
        heapTotalMb: m.heapTotal / MB,
        externalMb: m.external / MB,
    };
}
export class MemoryOptimizer {
    limitMb = 20;
    gcHints = new GCHints();
    monitor = new MemoryMonitor();
    optimize() {
        return this.triggerOptimization();
    }
    setLimit(limit) {
        this.limitMb = Math.max(1, limit);
    }
    getUsage() {
        return sample();
    }
    triggerOptimization() {
        const before = sample();
        const gcTriggered = before.rssMb > this.limitMb ? this.gcHints.triggerGC() : false;
        const after = sample();
        return {
            beforeRssMb: before.rssMb,
            afterRssMb: after.rssMb,
            reclaimedMb: Math.max(0, before.rssMb - after.rssMb),
            gcTriggered,
        };
    }
    startMonitoring(intervalMs = 5000) {
        this.monitor.startMonitoring(intervalMs);
        this.gcHints.scheduleGC();
    }
    stopMonitoring() {
        this.monitor.stopMonitoring();
        this.gcHints.stop();
    }
}
//# sourceMappingURL=optimizer.js.map