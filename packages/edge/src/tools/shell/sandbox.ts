export interface SandboxSpec {
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}

export class Sandbox {
  private spec: SandboxSpec = {
    cwd: process.cwd(),
    env: {},
    timeoutMs: 10_000,
  };

  restrict(options: Partial<Pick<SandboxSpec, "timeoutMs">>): void {
    if (options.timeoutMs !== undefined) {
      this.spec.timeoutMs = Math.max(500, options.timeoutMs);
    }
  }

  isolate(options: Partial<Pick<SandboxSpec, "cwd" | "env">>): SandboxSpec {
    if (options.cwd) {
      this.spec.cwd = options.cwd;
    }
    if (options.env) {
      this.spec.env = { ...options.env };
    }
    return this.getSpec();
  }

  cleanup(): void {
    this.spec = {
      cwd: process.cwd(),
      env: {},
      timeoutMs: 10_000,
    };
  }

  getSpec(): SandboxSpec {
    return {
      cwd: this.spec.cwd,
      env: { ...this.spec.env },
      timeoutMs: this.spec.timeoutMs,
    };
  }
}
