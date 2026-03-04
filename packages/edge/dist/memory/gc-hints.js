export class GCHints {
    timer = null;
    frequencyMs = 60_000;
    gcRuns = 0;
    triggerGC() {
        const globalWithGC = globalThis;
        if (typeof globalWithGC.gc === "function") {
            globalWithGC.gc();
            this.gcRuns += 1;
            return true;
        }
        return false;
    }
    scheduleGC() {
        this.stop();
        this.timer = setInterval(() => {
            this.triggerGC();
        }, this.frequencyMs);
        this.timer.unref();
    }
    setGCFrequency(ms) {
        this.frequencyMs = Math.max(1_000, ms);
        if (this.timer) {
            this.scheduleGC();
        }
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    getRuns() {
        return this.gcRuns;
    }
}
//# sourceMappingURL=gc-hints.js.map