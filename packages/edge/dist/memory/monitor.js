import { LeakDetector } from "./leak-detector.js";
const MB = 1024 * 1024;
export class MemoryMonitor {
    samples = [];
    timer = null;
    leakDetector = new LeakDetector();
    startMonitoring(intervalMs = 5_000) {
        this.stopMonitoring();
        this.timer = setInterval(() => {
            this.samples.push(this.currentSample());
            if (this.samples.length > 10_000) {
                this.samples.shift();
            }
        }, intervalMs);
        this.timer.unref();
    }
    stopMonitoring() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    detectLeak(maxAgeMs = 120_000) {
        return this.leakDetector.detect(maxAgeMs).suspected;
    }
    trackObject(target, hint) {
        return this.leakDetector.track(target, hint);
    }
    getStats() {
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
    currentSample() {
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
//# sourceMappingURL=monitor.js.map