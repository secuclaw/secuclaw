export declare class GCHints {
    private timer;
    private frequencyMs;
    private gcRuns;
    triggerGC(): boolean;
    scheduleGC(): void;
    setGCFrequency(ms: number): void;
    stop(): void;
    getRuns(): number;
}
//# sourceMappingURL=gc-hints.d.ts.map