import type { ScheduledTask, Priority } from "./types.js";
import { PriorityOrder } from "./types.js";

export class PriorityTaskQueue {
  private tasks: ScheduledTask[] = [];

  enqueue(task: ScheduledTask): void {
    this.tasks.push(task);
    this.tasks.sort(this.compareTasks);
  }

  dequeue(): ScheduledTask | undefined {
    return this.tasks.shift();
  }

  peek(): ScheduledTask | undefined {
    return this.tasks[0];
  }

  remove(handId: string): boolean {
    const index = this.tasks.findIndex((t) => t.handId === handId);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.tasks = [];
  }

  size(): number {
    return this.tasks.length;
  }

  isEmpty(): boolean {
    return this.tasks.length === 0;
  }

  toArray(): ScheduledTask[] {
    return [...this.tasks];
  }

  private compareTasks(a: ScheduledTask, b: ScheduledTask): number {
    const priorityDiff = PriorityOrder[a.priority] - PriorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.scheduledTime.getTime() - b.scheduledTime.getTime();
  }

  getByHandId(handId: string): ScheduledTask | undefined {
    return this.tasks.find((t) => t.handId === handId);
  }

  updatePriority(handId: string, priority: Priority): void {
    const task = this.getByHandId(handId);
    if (task) {
      this.remove(handId);
      task.priority = priority;
      this.enqueue(task);
    }
  }
}
