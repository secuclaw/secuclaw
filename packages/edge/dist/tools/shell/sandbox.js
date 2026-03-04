export class Sandbox {
    spec = {
        cwd: process.cwd(),
        env: {},
        timeoutMs: 10_000,
    };
    restrict(options) {
        if (options.timeoutMs !== undefined) {
            this.spec.timeoutMs = Math.max(500, options.timeoutMs);
        }
    }
    isolate(options) {
        if (options.cwd) {
            this.spec.cwd = options.cwd;
        }
        if (options.env) {
            this.spec.env = { ...options.env };
        }
        return this.getSpec();
    }
    cleanup() {
        this.spec = {
            cwd: process.cwd(),
            env: {},
            timeoutMs: 10_000,
        };
    }
    getSpec() {
        return {
            cwd: this.spec.cwd,
            env: { ...this.spec.env },
            timeoutMs: this.spec.timeoutMs,
        };
    }
}
//# sourceMappingURL=sandbox.js.map