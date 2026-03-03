import type { ScheduledTask, TaskResult } from "./types.js";
import { WakePriority } from "./types.js";

export class TaskManager {
  private tasks: Map<string, ScheduledTask> = new Map();
  private cronTimers: Map<string, unknown> = new Map();

  register(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  unregister(taskId: string): void {
    this.tasks.delete(taskId);
    const timer = this.cronTimers.get(taskId);
    if (timer) {
      this.cronTimers.delete(taskId);
    }
  }

  get(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  getAll(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getByPriority(priority: WakePriority): ScheduledTask[] {
    return this.getAll().filter((t) => t.priority === priority);
  }

  enable(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
    }
  }

  disable(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
    }
  }

  async run(taskId: string): Promise<TaskResult | null> {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) {
      return { status: "skipped", reason: "Task not found or disabled" };
    }
    
    const ctx = {
      taskId: task.id,
      taskName: task.name,
      scheduledAt: Date.now(),
      triggeredBy: "manual" as const,
    };
    
    return task.handler(ctx);
  }

  clearAll(): void {
    this.tasks.clear();
    this.cronTimers.clear();
  }
}
