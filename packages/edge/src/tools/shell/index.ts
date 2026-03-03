import { CommandExecutor, type ShellResult } from "./executor.js";
import { Sandbox } from "./sandbox.js";
import { WhitelistManager } from "./whitelist.js";

export { ShellResult };

export class EdgeShellTool {
  private readonly executor = new CommandExecutor();
  private readonly sandbox = new Sandbox();
  private readonly whitelist = new WhitelistManager();

  async execute(command: string, args: string[] = []): Promise<ShellResult> {
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

  isAllowed(command: string): boolean {
    return this.whitelist.check(command);
  }

  async executeSandboxed(command: string): Promise<ShellResult> {
    if (!this.isAllowed(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    this.sandbox.restrict({ timeoutMs: 5_000 });
    const result = await this.execute(command, []);
    this.sandbox.cleanup();
    return result;
  }

  whitelistManager(): WhitelistManager {
    return this.whitelist;
  }
}
