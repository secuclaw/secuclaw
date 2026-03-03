import type { AgentTask, AgentTaskResult } from "./types.js";

export class MinimalAgent {
  private running = false;

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  async execute(task: AgentTask): Promise<AgentTaskResult> {
    const started = Date.now();
    if (!this.running) {
      return {
        taskId: task.id,
        ok: false,
        output: "agent-not-running",
        durationMs: Date.now() - started,
      };
    }

    switch (task.type) {
      case "scan":
        return {
          taskId: task.id,
          ok: true,
          output: `scan-lite:ok:${JSON.stringify(task.payload)}`,
          durationMs: Date.now() - started,
        };
      case "analyze":
        return {
          taskId: task.id,
          ok: true,
          output: `log-analysis:ok:${JSON.stringify(task.payload)}`,
          durationMs: Date.now() - started,
        };
      case "alert":
        return {
          taskId: task.id,
          ok: true,
          output: `alert-forwarded:${JSON.stringify(task.payload)}`,
          durationMs: Date.now() - started,
        };
      case "health":
      default:
        return {
          taskId: task.id,
          ok: true,
          output: "healthy",
          durationMs: Date.now() - started,
        };
    }
  }
}
