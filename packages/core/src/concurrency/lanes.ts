import { emitEvent } from "../events/stream.js";

export type LaneType = "session" | "global" | "tool" | "reasoning" | "audit";

export interface LaneConfig {
  type: LaneType;
  maxConcurrent: number;
  timeout: number;
  retryCount: number;
  priority: number;
}

export interface LaneTask {
  id: string;
  lane: LaneType;
  sessionId?: string;
  priority: number;
  handler: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface LaneState {
  type: LaneType;
  queue: LaneTask[];
  active: Set<string>;
  maxConcurrent: number;
  totalProcessed: number;
  totalFailed: number;
  avgWaitTime: number;
  avgExecTime: number;
}

const DEFAULT_LANE_CONFIGS: Record<LaneType, LaneConfig> = {
  session: { type: "session", maxConcurrent: 1, timeout: 300000, retryCount: 0, priority: 100 },
  global: { type: "global", maxConcurrent: 5, timeout: 60000, retryCount: 2, priority: 50 },
  tool: { type: "tool", maxConcurrent: 3, timeout: 120000, retryCount: 1, priority: 70 },
  reasoning: { type: "reasoning", maxConcurrent: 2, timeout: 180000, retryCount: 0, priority: 80 },
  audit: { type: "audit", maxConcurrent: 2, timeout: 60000, retryCount: 3, priority: 40 },
};

class LaneManager {
  private lanes: Map<LaneType, LaneState> = new Map();
  private configs: Map<LaneType, LaneConfig> = new Map();
  private taskQueue: Map<string, LaneTask> = new Map();
  private taskIdCounter = 0;
  private processing = false;

  constructor() {
    for (const [type, config] of Object.entries(DEFAULT_LANE_CONFIGS)) {
      this.lanes.set(type as LaneType, {
        type: type as LaneType,
        queue: [],
        active: new Set(),
        maxConcurrent: config.maxConcurrent,
        totalProcessed: 0,
        totalFailed: 0,
        avgWaitTime: 0,
        avgExecTime: 0,
      });
      this.configs.set(type as LaneType, config);
    }
    this.startProcessing();
  }

  private startProcessing(): void {
    this.processing = true;
    this.processLanes();
  }

  private async processLanes(): Promise<void> {
    if (!this.processing) return;

    for (const [laneType, lane] of this.lanes) {
      while (lane.queue.length > 0 && lane.active.size < lane.maxConcurrent) {
        const task = this.getNextTask(lane);
        if (!task) break;
        
        lane.active.add(task.id);
        task.startedAt = Date.now();

        this.executeTask(task, lane);
      }
    }

    await new Promise((r) => setTimeout(r, 10));
    if (this.processing) {
      setImmediate(() => this.processLanes());
    }
  }

  private getNextTask(lane: LaneState): LaneTask | undefined {
    if (lane.queue.length === 0) return undefined;
    
    lane.queue.sort((a, b) => b.priority - a.priority);
    return lane.queue.shift();
  }

  private async executeTask(task: LaneTask, lane: LaneState): Promise<void> {
    const config = this.configs.get(lane.type)!;
    const runId = `run-${task.id}`;
    const sessionId = task.sessionId || "global";

    emitEvent("lane.dequeue", runId, sessionId, {
      taskId: task.id,
      lane: lane.type,
      waitTime: Date.now() - task.enqueuedAt,
    });

    try {
      const result = await Promise.race([
        task.handler(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Task timeout")), config.timeout)
        ),
      ]);

      task.completedAt = Date.now();
      const execTime = task.completedAt - (task.startedAt ?? task.enqueuedAt);
      
      lane.totalProcessed++;
      lane.avgExecTime = (lane.avgExecTime * (lane.totalProcessed - 1) + execTime) / lane.totalProcessed;

      emitEvent("lane.complete", runId, sessionId, {
        taskId: task.id,
        lane: lane.type,
        success: true,
        execTime,
      });

      task.resolve(result);
    } catch (error) {
      lane.totalFailed++;
      
      emitEvent("lane.complete", runId, sessionId, {
        taskId: task.id,
        lane: lane.type,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      task.reject(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      lane.active.delete(task.id);
      this.taskQueue.delete(task.id);
    }
  }

  async enqueue<T>(
    lane: LaneType,
    handler: () => Promise<T>,
    options?: { sessionId?: string; priority?: number }
  ): Promise<T> {
    const taskId = `task-${++this.taskIdCounter}`;
    const laneState = this.lanes.get(lane);
    if (!laneState) {
      throw new Error(`Unknown lane type: ${lane}`);
    }

    const config = this.configs.get(lane)!;
    const priority = options?.priority ?? config.priority;
    const sessionId = options?.sessionId;

    return new Promise<T>((resolve, reject) => {
      const task: LaneTask = {
        id: taskId,
        lane,
        sessionId,
        priority,
        handler: handler as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
      };

      laneState.queue.push(task);
      this.taskQueue.set(taskId, task);

      const runId = `run-${taskId}`;
      emitEvent("lane.enqueue", runId, sessionId || "global", {
        taskId,
        lane,
        queueSize: laneState.queue.length,
        priority,
      });
    });
  }

  setConcurrency(lane: LaneType, maxConcurrent: number): void {
    const laneState = this.lanes.get(lane);
    if (laneState) {
      laneState.maxConcurrent = maxConcurrent;
    }
  }

  getLaneStats(lane?: LaneType): LaneState | LaneState[] {
    if (lane) {
      return this.lanes.get(lane)!;
    }
    return Array.from(this.lanes.values());
  }

  getQueueLength(lane: LaneType): number {
    return this.lanes.get(lane)?.queue.length ?? 0;
  }

  getActiveCount(lane: LaneType): number {
    return this.lanes.get(lane)?.active.size ?? 0;
  }

  async drain(lane?: LaneType): Promise<void> {
    const lanes = lane ? [lane] : (Object.keys(DEFAULT_LANE_CONFIGS) as LaneType[]);
    
    const promises: Promise<void>[] = [];
    for (const l of lanes) {
      const laneState = this.lanes.get(l);
      if (laneState && laneState.active.size > 0) {
        promises.push(
          new Promise((resolve) => {
            const check = () => {
              if (laneState.active.size === 0) {
                resolve();
              } else {
                setTimeout(check, 50);
              }
            };
            check();
          })
        );
      }
    }
    
    await Promise.all(promises);
  }

  stop(): void {
    this.processing = false;
  }
}

export const laneManager = new LaneManager();

export function enqueueInLane<T>(
  lane: LaneType,
  handler: () => Promise<T>,
  options?: { sessionId?: string; priority?: number }
): Promise<T> {
  return laneManager.enqueue(lane, handler, options);
}

export function setLaneConcurrency(lane: LaneType, maxConcurrent: number): void {
  laneManager.setConcurrency(lane, maxConcurrent);
}

export function getLaneStats(lane?: LaneType): LaneState | LaneState[] {
  return laneManager.getLaneStats(lane);
}
