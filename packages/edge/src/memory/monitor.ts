import type { MemoryUsageSample, MemoryStats } from "./types.js";
import { LeakDetector } from "./leak-detector.js";

const MB = 1024 * 1024;

export class MemoryMonitor {
  private readonly samples: MemoryUsageSample[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly leakDetector = new LeakDetector();

  startMonitoring(intervalMs: number = 5_000): void {
    this.stopMonitoring();
    this.timer = setInterval(() => {
      this.samples.push(this.currentSample());
      if (this.samples.length > 10_000) {
        this.samples.shift();
      }
    }, intervalMs);
    this.timer.unref();
  }

  stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  detectLeak(maxAgeMs: number = 120_000): boolean {
    return this.leakDetector.detect(maxAgeMs).suspected;
  }

  trackObject(target: object, hint: string): string {
    return this.leakDetector.track(target, hint);
  }

  getStats(): MemoryStats {
    if (this.samples.length === 0) {
      return {
        peakRssMb: 0,
        avgRssMb: 0,
        gcRuns: 0,
        leakSuspected: false,
        samples: 0,
      };
    }

    const rssValues = this.samples.map((s) => s.rssMb);
    const total = rssValues.reduce((sum, value) => sum + value, 0);
    return {
      peakRssMb: Math.max(...rssValues),
      avgRssMb: total / rssValues.length,
      gcRuns: 0,
      leakSuspected: this.detectLeak(),
      samples: this.samples.length,
    };
  }

  private currentSample(): MemoryUsageSample {
    const m = process.memoryUsage();
    return {
      timestamp: Date.now(),
      rssMb: m.rss / MB,
      heapUsedMb: m.heapUsed / MB,
      heapTotalMb: m.heapTotal / MB,
      externalMb: m.external / MB,
    };
  }
}
