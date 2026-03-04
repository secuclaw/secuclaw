export interface GuardOptions {
    allowedRoots: string[];
    maxFileSizeBytes: number;
}
export declare class FileGuard {
    private readonly options;
    constructor(options?: Partial<GuardOptions>);
    sanitize(filePath: string): string;
    validate(filePath: string): boolean;
    restrict(filePath: string): void;
    getMaxFileSizeBytes(): number;
}
//# sourceMappingURL=guard.d.ts.map