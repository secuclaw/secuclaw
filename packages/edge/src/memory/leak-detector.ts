import type { LeakReport } from "./types.js";

interface TrackedRecord {
  id: string;
  hint: string;
  createdAt: number;
}

export class LeakDetector {
  private readonly records = new Map<object, TrackedRecord>();
  private counter = 0;

  track(target: object, hint: string): string {
    const id = `tracked-${Date.now()}-${++this.counter}`;
    this.records.set(target, {
      id,
      hint,
      createdAt: Date.now(),
    });
    return id;
  }

  untrack(target: object): boolean {
    return this.records.delete(target);
  }

  detect(maxAgeMs: number = 120_000): LeakReport {
    const now = Date.now();
    const stale: string[] = [];

    for (const entry of this.records.values()) {
      if (now - entry.createdAt >= maxAgeMs) {
        stale.push(`${entry.id}:${entry.hint}`);
      }
    }

    return {
      suspected: stale.length > 0,
      tracked: this.records.size,
      unresolved: stale.length,
      details: stale,
    };
  }

  report(maxAgeMs: number = 120_000): string {
    const r = this.detect(maxAgeMs);
    return JSON.stringify(r);
  }
}
