import type {
  ScheduleConfig,
  SchedulePolicy,
  SchedulerConfig,
  SchedulerStats,
  ScheduledTask,
  TaskExecutionResult,
  SchedulerEvent,
} from "./types.js";
import type { HandRegistry } from "../registry.js";
import { PriorityTaskQueue } from "./queue.js";
import { HandExecutor } from "./executor.js";
import { calculateNextRun, isDue, calculateBackoff } from "./policies.js";
import { createDefaultLogger, createDefaultStorage, createDefaultMemoryStore, createDefaultToolRegistry } from "../base.js";
import type { Logger, Storage } from "../context.js";
import type { HandResult } from "../result.js";

export class HandScheduler {
  private schedules = new Map<string, ScheduleConfig>();
  private taskQueue = new PriorityTaskQueue();
  private executor: HandExecutor;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private eventListeners = new Map<string, Set<(event: SchedulerEvent) => void>>();
  private completedTasks = 0;
  private failedTasks = 0;
  private totalDuration = 0;
  private storage?: Storage;
  private logger: Logger;

  constructor(
    private config: SchedulerConfig,
    private registry: HandRegistry
  ) {
    this.executor = new HandExecutor({
      maxConcurrency: config.maxConcurrency,
      defaultTimeout: config.defaultTimeoutMs,
    });
    this.logger = createDefaultLogger("HandScheduler");
  }

  register(handId: string, policy: SchedulePolicy): void {
    const schedule: ScheduleConfig = {
      handId,
      enabled: true,
      policy,
      runCount: 0,
      errorCount: 0,
      nextRun: calculateNextRun(policy),
    };

    this.schedules.set(handId, schedule);
    this.scheduleNextTask(handId);
    this.emit({ type: "schedule_updated", handId });
    this.logger.info(`Registered hand: ${handId}`);
  }

  unregister(handId: string): void {
    const schedule = this.schedules.get(handId);
    if (schedule) {
      this.executor.cancel(handId);
      this.taskQueue.remove(handId);
      this.schedules.delete(handId);
      this.logger.info(`Unregistered hand: ${handId}`);
    }
  }

  updateSchedule(handId: string, policy: SchedulePolicy): void {
    const existing = this.schedules.get(handId);
    if (existing) {
      existing.policy = policy;
      existing.nextRun = calculateNextRun(policy, existing.lastRun);
      this.scheduleNextTask(handId);
      this.emit({ type: "schedule_updated", handId });
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    if (this.config.persistence) {
      await this.loadSchedules();
    }

    this.tickInterval = setInterval(() => this.tick(), this.config.tickIntervalMs);
    this.emit({ type: "scheduler_started" });
    this.logger.info("Scheduler started");
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    if (this.config.persistence) {
      await this.persistSchedules();
    }

    this.emit({ type: "scheduler_stopped" });
    this.logger.info("Scheduler stopped");
  }

  async runNow(handId: string): Promise<HandResult> {
    const schedule = this.schedules.get(handId);
    if (!schedule) {
      throw new Error(`Hand '${handId}' not registered`);
    }

    const instance = await this.registry.activate(handId);

    const task: ScheduledTask = {
      handId,
      instanceId: instance.instanceId,
      scheduledTime: new Date(),
      priority: schedule.policy.priority,
      retryCount: 0,
    };

    this.emit({ type: "task_started", task });

    const activeHand = this.registry.getActiveInstances().find(i => i.instanceId === instance.instanceId);
    if (!activeHand) {
      throw new Error(`Failed to get active hand '${handId}'`);
    }

    const context = (activeHand as any).createContext({
      instanceId: instance.instanceId,
      timeout: schedule.policy.timeoutMs,
    });

    const result = await this.executor.execute(task, activeHand as any, context);

    schedule.lastRun = new Date();
    schedule.runCount++;

    const errorToError = (err?: { message: string }): Error | undefined => {
      return err ? new Error(err.message) : undefined;
    };

    const execResult: TaskExecutionResult = {
      task,
      success: result.success,
      result: result.data,
      error: errorToError(result.error),
      duration: result.duration,
      retryAttempt: 0,
    };

    if (result.success) {
      this.completedTasks++;
      this.emit({ type: "task_completed", task, result: execResult });
    } else {
      schedule.errorCount++;
      this.failedTasks++;
      this.emit({ type: "task_failed", task, error: errorToError(result.error) ?? new Error("Unknown error"), result: execResult });
    }

    this.totalDuration += result.duration;

    await this.registry.terminate(instance.instanceId);

    return result;
  }

  async runNext(): Promise<HandResult | undefined> {
    const task = this.taskQueue.dequeue();
    if (!task) {
      return undefined;
    }

    const schedule = this.schedules.get(task.handId);
    if (!schedule) {
      return undefined;
    }

    return this.executeTask(task, schedule);
  }

  getSchedule(handId: string): ScheduleConfig | undefined {
    return this.schedules.get(handId);
  }

  listScheduled(): Array<{ handId: string; schedule: ScheduleConfig }> {
    return Array.from(this.schedules.entries()).map(([handId, schedule]) => ({
      handId,
      schedule,
    }));
  }

  getNextRunTime(handId: string): Date | undefined {
    return this.schedules.get(handId)?.nextRun;
  }

  getStats(): SchedulerStats {
    const avgDuration = this.completedTasks > 0 ? this.totalDuration / this.completedTasks : 0;

    return {
      totalTasks: this.schedules.size,
      activeTasks: this.executor.getActiveCount(),
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      averageDuration: avgDuration,
    };
  }

  on(event: string, callback: (event: SchedulerEvent) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private errorToError(err?: { message: string }): Error | undefined {
    return err ? new Error(err.message) : undefined;
  }

  private async executeTask(task: ScheduledTask, schedule: ScheduleConfig): Promise<HandResult> {
    this.emit({ type: "task_started", task });

    try {
      const instance = await this.registry.activate(task.handId);

      const activeHand = this.registry.getActiveInstances().find(i => i.instanceId === instance.instanceId);
      if (!activeHand) {
        throw new Error(`Failed to activate hand '${task.handId}'`);
      }

      const context = (activeHand as any).createContext({
        instanceId: instance.instanceId,
        scheduledTime: task.scheduledTime,
        timeout: schedule.policy.timeoutMs,
        maxRetries: schedule.policy.retry.maxAttempts,
        config: {},
        logger: this.logger,
        storage: this.storage ?? createDefaultStorage(),
        memory: createDefaultMemoryStore(),
        tools: createDefaultToolRegistry(),
        reportProgress: () => {},
        reportMetric: () => {},
        emitEvent: () => {},
      });

      const result = await this.executor.execute(task, activeHand as any, context);

      schedule.lastRun = new Date();
      schedule.runCount++;

      if (!result.success && task.retryCount < schedule.policy.retry.maxAttempts) {
        const delay = calculateBackoff(schedule.policy.retry, task.retryCount);
        this.emit({ type: "task_retry", task, attempt: task.retryCount + 1 });

        await new Promise((resolve) => setTimeout(resolve, delay));

        const retryTask: ScheduledTask = {
          ...task,
          retryCount: task.retryCount + 1,
        };

        return this.executeTask(retryTask, schedule);
      }

      const taskResult: TaskExecutionResult = {
        task,
        success: result.success,
        result: result.data,
        error: this.errorToError(result.error),
        duration: result.duration,
        retryAttempt: task.retryCount,
      };

      if (result.success) {
        this.completedTasks++;
        this.emit({ type: "task_completed", task, result: taskResult });
      } else {
        schedule.errorCount++;
        this.failedTasks++;
        this.emit({ type: "task_failed", task, error: this.errorToError(result.error) ?? new Error("Unknown error"), result: taskResult });
      }

      this.totalDuration += result.duration;

      await this.registry.terminate(instance.instanceId);

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      schedule.errorCount++;
      this.failedTasks++;

      this.emit({ type: "task_failed", task, error: err });

      throw err;
    }
  }

  private tick(): void {
    for (const [handId, schedule] of Array.from(this.schedules.entries())) {
      if (isDue(schedule) && this.executor.getAvailableSlots() > 0) {
        this.scheduleNextTask(handId);
      }
    }

    this.processQueue();
  }

  private scheduleNextTask(handId: string): void {
    const schedule = this.schedules.get(handId);
    if (!schedule || !schedule.enabled) {
      return;
    }

    const existingTask = this.taskQueue.getByHandId(handId);
    if (existingTask) {
      return;
    }

    if (!schedule.nextRun || new Date() >= schedule.nextRun) {
      const task: ScheduledTask = {
        handId,
        instanceId: `${handId}-${Date.now()}`,
        scheduledTime: schedule.nextRun ?? new Date(),
        priority: schedule.policy.priority,
        retryCount: 0,
      };

      this.taskQueue.enqueue(task);
      schedule.nextRun = calculateNextRun(schedule.policy, schedule.lastRun);
    }
  }

  private async processQueue(): Promise<void> {
    while (!this.taskQueue.isEmpty() && this.executor.getAvailableSlots() > 0) {
      const task = this.taskQueue.dequeue();
      if (!task) {
        break;
      }

      const schedule = this.schedules.get(task.handId);
      if (!schedule || !schedule.enabled) {
        continue;
      }

      this.executeTask(task, schedule).catch((error) => {
        this.logger.error(`Task execution failed: ${error.message}`);
      });
    }
  }

  private emit(event: SchedulerEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(event);
        } catch (error) {
          this.logger.error("Event listener error:", error);
        }
      });
    }

    const wildcard = this.eventListeners.get("*");
    if (wildcard) {
      wildcard.forEach((cb) => {
        try {
          cb(event);
        } catch (error) {
          this.logger.error("Event listener error:", error);
        }
      });
    }
  }

  private async loadSchedules(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const data = await this.storage.get<string>("scheduler_schedules");
      if (data) {
        const parsed = JSON.parse(data) as ScheduleConfig[];
        for (const schedule of parsed) {
          if (schedule.nextRun) {
            schedule.nextRun = new Date(schedule.nextRun);
          }
          if (schedule.lastRun) {
            schedule.lastRun = new Date(schedule.lastRun);
          }
          this.schedules.set(schedule.handId, schedule);
        }
      }
    } catch (error) {
      this.logger.warn("Failed to load schedules:", error);
    }
  }

  private async persistSchedules(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const schedules = Array.from(this.schedules.values());
      await this.storage.set("scheduler_schedules", JSON.stringify(schedules));
    } catch (error) {
      this.logger.warn("Failed to persist schedules:", error);
    }
  }
}
