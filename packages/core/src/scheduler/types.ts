export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number;
  wakeMergeWindowMs: number;
  maxConcurrentTasks: number;
  prompt?: string;
  target?: string;
  model?: string;
  ackMaxChars?: number;
  activeHours?: {
    start: string;
    end: string;
  };
}

export interface WakeConfig {
  mergeWindowMs: number;
  priority: WakePriority;
}

export enum WakePriority {
  RETRY = 0,
  INTERVAL = 1,
  DEFAULT = 2,
  ACTION = 3,
}

export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression?: string;
  intervalMs?: number;
  handler: TaskHandler;
  priority: WakePriority;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
}

export interface TaskContext {
  taskId: string;
  taskName: string;
  scheduledAt: number;
  triggeredBy: "schedule" | "manual" | "wake";
}

export interface TaskHandler {
  (ctx: TaskContext): Promise<TaskResult>;
}

export interface TaskResult {
  status: "ran" | "skipped" | "failed";
  durationMs?: number;
  reason?: string;
}

export interface SchedulerStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;
  averageDurationMs: number;
}

export type HeartbeatRunResult =
  | { status: "ran"; durationMs: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export interface HeartbeatWakeHandler {
  (opts: {
    reason?: string;
    agentId?: string;
    sessionKey?: string;
  }): Promise<HeartbeatRunResult>;
}

export interface WakeRequest {
  reason?: string;
  agentId?: string;
  sessionKey?: string;
  requestedAt: number;
}

export interface PendingWake {
  reason: string;
  priority: number;
  requestedAt: number;
  agentId?: string;
  sessionKey?: string;
}

export type WakeKind = "retry" | "interval" | "default" | "action" | "normal";

export interface WakeState {
  handler: HeartbeatWakeHandler | null;
  pendingWakes: Map<string, PendingWake>;
  scheduled: boolean;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  timerDueAt: number | null;
  timerKind: WakeKind | null;
}

export interface SchedulerConfig {
  heartbeat?: HeartbeatConfig;
  tasks?: ScheduledTask[];
}

export interface Scheduler {
  start(): Promise<void>;
  stop(): Promise<void>;
  scheduleTask(task: ScheduledTask): void;
  cancelTask(taskId: string): boolean;
  runTaskNow(taskId: string): Promise<TaskResult>;
}
