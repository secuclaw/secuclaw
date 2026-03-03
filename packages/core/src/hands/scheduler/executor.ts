import type { ScheduledTask, TaskExecutionResult } from "./types.js";
import type { BaseHand } from "../base.js";
import type { HandContext } from "../context.js";
import type { HandResult } from "../result.js";
import { createDefaultLogger, createDefaultStorage, createDefaultMemoryStore, createDefaultToolRegistry } from "../base.js";

export class HandExecutor {
  private activeCount = 0;
  private slots: Promise<void>[];
  private slotResolvers: Array<() => void> = [];
  private runningTasks = new Map<string, { cancel: () => void }>();
  private logger = createDefaultLogger("HandExecutor");

  constructor(
    private config: { maxConcurrency: number; defaultTimeout: number }
  ) {
    this.slots = [];
    for (let i = 0; i < config.maxConcurrency; i++) {
      this.slots.push(Promise.resolve());
    }
  }

  async execute(task: ScheduledTask, hand: BaseHand, context: HandContext): Promise<HandResult> {
    return this.executeWithTimeout(task, hand, context, this.config.defaultTimeout);
  }

  async executeWithTimeout(
    task: ScheduledTask,
    hand: BaseHand,
    context: HandContext,
    timeout: number
  ): Promise<HandResult> {
    await this.acquireSlot();

    const taskInfo = { cancel: () => {} };
    this.runningTasks.set(task.handId, taskInfo);

    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Execution timeout after ${timeout}ms`));
        }, timeout);
        taskInfo.cancel = () => clearTimeout(timeoutId);
      });

      const result = await Promise.race([hand.execute(context), timeoutPromise]);

      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: {
          code: "EXECUTION_ERROR",
          message: err.message,
          recoverable: true,
        },
        duration: Date.now() - startTime,
        metrics: hand.getMetrics(),
      };
    } finally {
      this.runningTasks.delete(task.handId);
      this.releaseSlot();
    }
  }

  async acquireSlot(): Promise<void> {
    const slot = this.slots[this.activeCount];
    this.activeCount++;

    await slot;
  }

  releaseSlot(): void {
    if (this.activeCount > 0) {
      this.activeCount--;
    }

    let resolver: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    this.slots[this.activeCount] = promise;
    resolver!();
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getAvailableSlots(): number {
    return this.config.maxConcurrency - this.activeCount;
  }

  cancel(handId: string): void {
    const task = this.runningTasks.get(handId);
    if (task) {
      task.cancel();
      this.runningTasks.delete(handId);
    }
  }

  isRunning(handId: string): boolean {
    return this.runningTasks.has(handId);
  }
}
