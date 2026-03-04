import { CommandExecutor } from "./executor.js";
import { Sandbox } from "./sandbox.js";
import { WhitelistManager } from "./whitelist.js";
export class EdgeShellTool {
    executor = new CommandExecutor();
    sandbox = new Sandbox();
    whitelist = new WhitelistManager();
    async execute(command, args = []) {
        if (!this.isAllowed(command)) {
            throw new Error(`Command not allowed: ${command}`);
        }
        const spec = this.sandbox.getSpec();
        return this.executor.execute(command, args, {
            cwd: spec.cwd,
            env: spec.env,
            timeoutMs: spec.timeoutMs,
        });
    }
    isAllowed(command) {
        return this.whitelist.check(command);
    }
    async executeSandboxed(command) {
        if (!this.isAllowed(command)) {
            throw new Error(`Command not allowed: ${command}`);
        }
        this.sandbox.restrict({ timeoutMs: 5_000 });
        const result = await this.execute(command, []);
        this.sandbox.cleanup();
        return result;
    }
    whitelistManager() {
        return this.whitelist;
    }
}
//# sourceMappingURL=index.js.map