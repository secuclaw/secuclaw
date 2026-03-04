export interface ShellResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
}
export interface ExecuteOptions {
    timeoutMs?: number;
    cwd?: string;
    env?: Record<string, string>;
    /** Allow commands outside the default whitelist (use with caution) */
    bypassWhitelist?: boolean;
}
export declare class CommandExecutor {
    execute(command: string, args?: string[], options?: ExecuteOptions): Promise<ShellResult>;
    executeWithTimeout(command: string, args: string[] | undefined, timeoutMs: number, options?: Omit<ExecuteOptions, "timeoutMs">): Promise<ShellResult>;
    stream(command: string, args?: string[], options?: ExecuteOptions): AsyncIterable<string>;
}
//# sourceMappingURL=executor.d.ts.map