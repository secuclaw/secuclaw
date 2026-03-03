import type { HeartbeatConfig, ScheduledTask, TaskResult, SchedulerStats, TaskContext } from "./types.js";

export class HeartbeatRunner {
  private config: HeartbeatConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private timer: unknown = null;
  private stats: SchedulerStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    skippedRuns: 0,
    averageDurationMs: 0,
  };
  private running = false;

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 10000,
      wakeMergeWindowMs: config.wakeMergeWindowMs ?? 250,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
    };
  }

  registerTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  unregisterTask(taskId: string): void {
    this.tasks.delete(taskId);
  }

  start(): void {
    if (this.running || !this.config.enabled) return;
    this.running = true;
    this.timer = setTimeout(() => { this.runAll(); }, this.config.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer as unknown as number);
      this.timer = null;
    }
    this.running = false;
  }

  private async runAll(): Promise<void> {
    const enabledTasks = Array.from(this.tasks.values()).filter((t) => t.enabled);
    const results = await Promise.allSettled(enabledTasks.map((t) => this.runTask(t)));
    
    for (const result of results) {
      if (result.status === "fulfilled") {
        const taskResult = result.value;
        this.stats.totalRuns++;
        if (taskResult.status === "ran") {
          this.stats.successfulRuns++;
        } else if (taskResult.status === "skipped") {
          this.stats.skippedRuns++;
        } else {
          this.stats.failedRuns++;
        }
      }
    }
  }

  private async runTask(task: ScheduledTask): Promise<TaskResult> {
    const start = Date.now();
    const ctx: TaskContext = {
      taskId: task.id,
      taskName: task.name,
      scheduledAt: start,
      triggeredBy: "schedule",
    };
    
    try {
      const result = await task.handler(ctx);
      task.lastRun = start;
      task.nextRun = start + this.config.intervalMs;
      return result;
    } catch (error) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getStats(): SchedulerStats {
    return { ...this.stats };
  }
}
