import type { AgentTask, AgentTaskResult } from "./types.js";
export declare class MinimalAgent {
    private running;
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    execute(task: AgentTask): Promise<AgentTaskResult>;
}
//# sourceMappingURL=minimal-agent.d.ts.map