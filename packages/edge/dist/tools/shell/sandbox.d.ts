export interface SandboxSpec {
    cwd: string;
    env: Record<string, string>;
    timeoutMs: number;
}
export declare class Sandbox {
    private spec;
    restrict(options: Partial<Pick<SandboxSpec, "timeoutMs">>): void;
    isolate(options: Partial<Pick<SandboxSpec, "cwd" | "env">>): SandboxSpec;
    cleanup(): void;
    getSpec(): SandboxSpec;
}
//# sourceMappingURL=sandbox.d.ts.map