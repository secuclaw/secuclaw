export class GCHints {
  private timer: NodeJS.Timeout | null = null;
  private frequencyMs = 60_000;
  private gcRuns = 0;

  triggerGC(): boolean {
    const globalWithGC = globalThis as typeof globalThis & { gc?: () => void };
    if (typeof globalWithGC.gc === "function") {
      globalWithGC.gc();
      this.gcRuns += 1;
      return true;
    }
    return false;
  }

  scheduleGC(): void {
    this.stop();
    this.timer = setInterval(() => {
      this.triggerGC();
    }, this.frequencyMs);
    this.timer.unref();
  }

  setGCFrequency(ms: number): void {
    this.frequencyMs = Math.max(1_000, ms);
    if (this.timer) {
      this.scheduleGC();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getRuns(): number {
    return this.gcRuns;
  }
}
