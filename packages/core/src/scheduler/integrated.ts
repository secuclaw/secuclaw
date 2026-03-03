import type {
  HeartbeatConfig,
  HeartbeatRunResult,
  HeartbeatWakeHandler,
  PendingWake,
  ScheduledTask,
  Scheduler,
  SchedulerConfig,
  SchedulerStats,
  TaskContext,
  TaskResult,
  WakeKind,
  WakeState,
} from "./types.js";
import { WakePriority } from "./types.js";
import { setHeartbeatWakeHandler, requestHeartbeatNow, resetWakeState, hasPendingHeartbeatWake } from "./wake.js";

const DEFAULT_CONFIG: HeartbeatConfig = {
  enabled: true,
  intervalMs: 10000,
  wakeMergeWindowMs: 250,
  maxConcurrentTasks: 10,
};

type TimerId = ReturnType<typeof setTimeout>;

export class IntegratedScheduler implements Scheduler {
  private config: HeartbeatConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervalTimer: TimerId | null = null;
  private running = false;
  private stats: SchedulerStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    skippedRuns: 0,
    averageDurationMs: 0,
  };
  private activeTasks = 0;
  private totalDuration = 0;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config?.heartbeat };

    if (config?.tasks) {
      for (const task of config.tasks) {
        this.tasks.set(task.id, task);
      }
    }

    this.setupWakeHandler();
  }

  private setupWakeHandler(): void {
    const handler: HeartbeatWakeHandler = async (opts) => {
      const reason = opts.reason ?? "unknown";
      const startTime = Date.now();

      try {
        const result = await this.executeWake(reason, opts.agentId, opts.sessionKey);
        const durationMs = Date.now() - startTime;

        if (result === "ran") {
          return { status: "ran", durationMs };
        } else if (result === "skipped") {
          return { status: "skipped", reason: "No tasks to run" };
        } else {
          return { status: "failed", reason: result };
        }
      } catch (error) {
        return {
          status: "failed",
          reason: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };

    setHeartbeatWakeHandler(handler);
  }

  private async executeWake(reason: string, agentId?: string, sessionKey?: string): Promise<"ran" | "skipped" | string> {
    const enabledTasks = Array.from(this.tasks.values())
      .filter((t) => t.enabled)
      .sort((a, b) => b.priority - a.priority);

    if (enabledTasks.length === 0) {
      return "skipped";
    }

    const tasksToRun = this.filterTasksByReason(enabledTasks, reason);

    if (tasksToRun.length === 0) {
      return "skipped";
    }

    let ranCount = 0;
    let lastError: string | null = null;

    for (const task of tasksToRun) {
      if (this.activeTasks >= this.config.maxConcurrentTasks) {
        break;
      }

      this.activeTasks++;
      const startTime = Date.now();

      try {
        const ctx: TaskContext = {
          taskId: task.id,
          taskName: task.name,
          scheduledAt: startTime,
          triggeredBy: reason === "interval" ? "schedule" : "wake",
        };

        const result = await task.handler(ctx);

        task.lastRun = startTime;
        this.updateStats(result, Date.now() - startTime);

        if (result.status === "ran") {
          ranCount++;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Task failed";
        this.stats.failedRuns++;
        this.stats.totalRuns++;
      } finally {
        this.activeTasks--;
      }
    }

    if (ranCount > 0) {
      return "ran";
    }

    return lastError ?? "skipped";
  }

  private filterTasksByReason(tasks: ScheduledTask[], reason: string): ScheduledTask[] {
    const lowerReason = reason.toLowerCase();

    if (lowerReason === "retry") {
      return tasks.filter((t) => t.lastRun !== undefined);
    }

    if (lowerReason === "interval") {
      return tasks.filter((t) => t.intervalMs !== undefined);
    }

    if (lowerReason === "action" || lowerReason === "wake") {
      return tasks.filter((t) => t.priority >= WakePriority.ACTION);
    }

    return tasks;
  }

  private updateStats(result: TaskResult, durationMs: number): void {
    this.stats.totalRuns++;
    this.totalDuration += durationMs;
    this.stats.averageDurationMs = this.totalDuration / this.stats.totalRuns;

    switch (result.status) {
      case "ran":
        this.stats.successfulRuns++;
        break;
      case "skipped":
        this.stats.skippedRuns++;
        break;
      case "failed":
        this.stats.failedRuns++;
        break;
    }
  }

  async start(): Promise<void> {
    if (this.running || !this.config.enabled) {
      return;
    }

    this.running = true;
    this.startIntervalTimer();
  }

  private startIntervalTimer(): void {
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
    }

    this.intervalTimer = setTimeout(() => {
      this.onInterval();
    }, this.config.intervalMs);
  }

  private onInterval(): void {
    if (!this.running) return;

    const now = Date.now();
    const tasksToTrigger = Array.from(this.tasks.values())
      .filter((t) => t.enabled && t.intervalMs !== undefined)
      .filter((t) => {
        if (!t.lastRun) return true;
        return now - t.lastRun >= (t.intervalMs ?? 0);
      });

    if (tasksToTrigger.length > 0) {
      requestHeartbeatNow({
        reason: "interval",
        coalesceMs: this.config.wakeMergeWindowMs,
      });
    }

    this.startIntervalTimer();
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
      this.intervalTimer = null;
    }

    resetWakeState();
  }

  scheduleTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  cancelTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  async runTaskNow(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        status: "failed",
        reason: `Task not found: ${taskId}`,
      };
    }

    const startTime = Date.now();
    const ctx: TaskContext = {
      taskId: task.id,
      taskName: task.name,
      scheduledAt: startTime,
      triggeredBy: "manual",
    };

    try {
      const result = await task.handler(ctx);
      task.lastRun = startTime;
      this.updateStats(result, Date.now() - startTime);
      return result;
    } catch (error) {
      const result: TaskResult = {
        status: "failed",
        reason: error instanceof Error ? error.message : "Task failed",
      };
      this.updateStats(result, Date.now() - startTime);
      return result;
    }
  }

  requestWake(opts?: { reason?: string; agentId?: string; sessionKey?: string }): void {
    requestHeartbeatNow({
      reason: opts?.reason ?? "action",
      coalesceMs: this.config.wakeMergeWindowMs,
      agentId: opts?.agentId,
      sessionKey: opts?.sessionKey,
    });
  }

  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  hasPendingWakes(): boolean {
    return hasPendingHeartbeatWake();
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.running) {
      this.startIntervalTimer();
    }
  }
}

export function createIntegratedScheduler(config?: Partial<SchedulerConfig>): IntegratedScheduler {
  return new IntegratedScheduler(config);
}
