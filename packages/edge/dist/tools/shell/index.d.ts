import { type ShellResult } from "./executor.js";
import { WhitelistManager } from "./whitelist.js";
export { ShellResult };
export declare class EdgeShellTool {
    private readonly executor;
    private readonly sandbox;
    private readonly whitelist;
    execute(command: string, args?: string[]): Promise<ShellResult>;
    isAllowed(command: string): boolean;
    executeSandboxed(command: string): Promise<ShellResult>;
    whitelistManager(): WhitelistManager;
}
//# sourceMappingURL=index.d.ts.map