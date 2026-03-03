import { GCHints } from "./gc-hints.js";
import { MemoryMonitor } from "./monitor.js";
import type { MemoryUsageSample, OptimizationResult } from "./types.js";

const MB = 1024 * 1024;

function sample(): MemoryUsageSample {
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
  private limitMb = 20;
  private readonly gcHints = new GCHints();
  private readonly monitor = new MemoryMonitor();

  optimize(): OptimizationResult {
    return this.triggerOptimization();
  }

  setLimit(limit: number): void {
    this.limitMb = Math.max(1, limit);
  }

  getUsage(): MemoryUsageSample {
    return sample();
  }

  triggerOptimization(): OptimizationResult {
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

  startMonitoring(intervalMs: number = 5000): void {
    this.monitor.startMonitoring(intervalMs);
    this.gcHints.scheduleGC();
  }

  stopMonitoring(): void {
    this.monitor.stopMonitoring();
    this.gcHints.stop();
  }
}
