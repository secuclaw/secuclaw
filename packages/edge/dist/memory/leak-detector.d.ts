import type { LeakReport } from "./types.js";
export declare class LeakDetector {
    private readonly records;
    private counter;
    track(target: object, hint: string): string;
    untrack(target: object): boolean;
    detect(maxAgeMs?: number): LeakReport;
    report(maxAgeMs?: number): string;
}
//# sourceMappingURL=leak-detector.d.ts.map