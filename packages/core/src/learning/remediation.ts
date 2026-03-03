import * as fs from "node:fs";
import * as path from "node:path";

export interface RemediationTask {
  id: string;
  title: string;
  description: string;
  type: "finding" | "gap" | "incident" | "risk" | "audit";
  status: "pending" | "in_progress" | "completed" | "verified" | "overdue";
  priority: "critical" | "high" | "medium" | "low";
  
  assignee?: string;
  owner?: string;
  reviewer?: string;
  
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completedAt?: number;
  verifiedAt?: number;
  
  relatedEntityId?: string;
  relatedEntityType?: string;
  relatedFramework?: string;
  relatedControlId?: string;
  
  evidence?: string[];
  notes?: string[];
  attachments?: string[];
  
  estimatedHours?: number;
  actualHours?: number;
  
  tags?: string[];
  category?: string;
}

export interface RemediationConfig {
  dataDir: string;
  defaultDueDays: number;
  overdueWarningDays: number;
  autoCloseDays: number;
  enableNotifications: boolean;
}

const DEFAULT_CONFIG: Omit<RemediationConfig, "dataDir"> = {
  defaultDueDays: 30,
  overdueWarningDays: 7,
  autoCloseDays: 90,
  enableNotifications: true,
};

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export class RemediationTracker {
  private tasks: Map<string, RemediationTask> = new Map();
  private config: RemediationConfig;
  private taskFile: string;

  constructor(config: Partial<RemediationConfig> & { dataDir: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as RemediationConfig;
    
    const dataDir = this.config.dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const remediationDir = path.join(dataDir, "remediation");
    if (!fs.existsSync(remediationDir)) {
      fs.mkdirSync(remediationDir, { recursive: true });
    }

    this.taskFile = path.join(remediationDir, "tasks.json");
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.taskFile)) {
      try {
        const content = fs.readFileSync(this.taskFile, "utf-8");
        const tasks = JSON.parse(content) as RemediationTask[];
        for (const task of tasks) {
          this.tasks.set(task.id, task);
        }
      } catch (e) {
        console.error("Failed to load remediation tasks:", e);
      }
    }
  }

  private saveToDisk(): void {
    const tasks = Array.from(this.tasks.values());
    fs.writeFileSync(this.taskFile, JSON.stringify(tasks, null, 2), "utf-8");
  }

  createTask(task: Omit<RemediationTask, "id" | "createdAt" | "updatedAt">): RemediationTask {
    const now = Date.now();
    const newTask: RemediationTask = {
      ...task,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    if (!newTask.dueDate && this.config.defaultDueDays) {
      newTask.dueDate = now + this.config.defaultDueDays * 24 * 60 * 60 * 1000;
    }

    this.tasks.set(newTask.id, newTask);
    this.saveToDisk();

    return newTask;
  }

  updateTask(id: string, updates: Partial<RemediationTask>): RemediationTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated: RemediationTask = {
      ...task,
      ...updates,
      id: task.id,
      createdAt: task.createdAt,
      updatedAt: Date.now(),
    };

    if (updates.status === "completed" && !task.completedAt) {
      updated.completedAt = Date.now();
    }

    if (updates.status === "verified" && !task.verifiedAt) {
      updated.verifiedAt = Date.now();
    }

    this.tasks.set(id, updated);
    this.saveToDisk();

    return updated;
  }

  assignTask(id: string, assignee: string): RemediationTask | undefined {
    return this.updateTask(id, { assignee });
  }

  startTask(id: string): RemediationTask | undefined {
    return this.updateTask(id, { status: "in_progress" });
  }

  completeTask(id: string, evidence?: string[]): RemediationTask | undefined {
    const updates: Partial<RemediationTask> = {
      status: "completed",
      completedAt: Date.now(),
    };

    if (evidence) {
      updates.evidence = [...(this.tasks.get(id)?.evidence || []), ...evidence];
    }

    return this.updateTask(id, updates);
  }

  verifyTask(id: string, reviewer: string): RemediationTask | undefined {
    return this.updateTask(id, {
      status: "verified",
      verifiedAt: Date.now(),
      reviewer,
    });
  }

  addNote(id: string, note: string): RemediationTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    return this.updateTask(id, {
      notes: [...(task.notes || []), note],
    });
  }

  getTask(id: string): RemediationTask | undefined {
    return this.tasks.get(id);
  }

  listTasks(filters?: {
    status?: RemediationTask["status"];
    priority?: RemediationTask["priority"];
    type?: RemediationTask["type"];
    assignee?: string;
    owner?: string;
    overdue?: boolean;
    dueWithinDays?: number;
  }): RemediationTask[] {
    let tasks = Array.from(this.tasks.values());

    if (filters) {
      if (filters.status) {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      if (filters.priority) {
        tasks = tasks.filter((t) => t.priority === filters.priority);
      }
      if (filters.type) {
        tasks = tasks.filter((t) => t.type === filters.type);
      }
      if (filters.assignee) {
        tasks = tasks.filter((t) => t.assignee === filters.assignee);
      }
      if (filters.owner) {
        tasks = tasks.filter((t) => t.owner === filters.owner);
      }
      if (filters.overdue) {
        const now = Date.now();
        tasks = tasks.filter((t) => 
          t.dueDate && t.dueDate < now && 
          t.status !== "completed" && t.status !== "verified"
        );
      }
      if (filters.dueWithinDays) {
        const now = Date.now();
        const future = now + filters.dueWithinDays * 24 * 60 * 60 * 1000;
        tasks = tasks.filter((t) => 
          t.dueDate && t.dueDate >= now && t.dueDate <= future
        );
      }
    }

    return tasks.sort((a, b) => {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.dueDate || 0) - (b.dueDate || 0);
    });
  }

  getOverdueTasks(): RemediationTask[] {
    return this.listTasks({ overdue: true });
  }

  getUpcomingDue(days: number = 7): RemediationTask[] {
    return this.listTasks({ dueWithinDays: days });
  }

  getStats(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    completedThisMonth: number;
    avgCompletionDays: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const now = Date.now();
    const thisMonth = new Date().setDate(1);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let overdue = 0;
    let completedThisMonth = 0;
    const completionDays: number[] = [];

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

      if (task.dueDate && task.dueDate < now && 
          task.status !== "completed" && task.status !== "verified") {
        overdue++;
      }

      if (task.completedAt && task.completedAt >= thisMonth) {
        completedThisMonth++;
        const days = (task.completedAt - task.createdAt) / (24 * 60 * 60 * 1000);
        completionDays.push(days);
      }
    }

    const avgCompletionDays = completionDays.length > 0
      ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length
      : 0;

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      completedThisMonth,
      avgCompletionDays,
    };
  }

  deleteTask(id: string): boolean {
    const deleted = this.tasks.delete(id);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }

  bulkCreateTasks(tasks: Omit<RemediationTask, "id" | "createdAt" | "updatedAt">[]): RemediationTask[] {
    return tasks.map((t) => this.createTask(t));
  }

  bulkUpdateStatus(ids: string[], status: RemediationTask["status"]): RemediationTask[] {
    const results: RemediationTask[] = [];
    for (const id of ids) {
      const updated = this.updateTask(id, { status });
      if (updated) results.push(updated);
    }
    return results;
  }
}

export const createRemediationTracker = (config: Partial<RemediationConfig> & { dataDir: string }) =>
  new RemediationTracker(config);
