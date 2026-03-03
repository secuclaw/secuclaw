/**
 * Hand Scheduler - Types
 * 
 * Type definitions for the Hand Scheduler system.
 */

// Schedule configuration for a specific hand
export interface ScheduleConfig {
  handId: string;
  enabled: boolean;
  policy: SchedulePolicy;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

// Schedule policy defining how a hand should be executed
export interface SchedulePolicy {
  // Timing
  cron?: string;           // Cron expression
  intervalMs?: number;      // Interval in ms
  delayMs?: number;        // Delay in ms
  
  // Concurrency
  concurrency: number;
  rateLimit?: number;
  
  // Retry
  retry: RetryPolicy;
  
  // Priority
  priority: Priority;
  
  // Timeout
  timeoutMs: number;
}

// Retry policy for failed executions
export interface RetryPolicy {
  maxAttempts: number;
  backoff: "fixed" | "exponential" | "linear";
  baseDelay: number;
  maxDelay: number;
}

// Priority levels for task scheduling
export type Priority = "low" | "normal" | "high" | "critical";

// Scheduler configuration
export interface SchedulerConfig {
  maxConcurrency: number;
  defaultTimeoutMs: number;
  tickIntervalMs: number;
  persistence: boolean;
}

// Scheduler statistics
export interface SchedulerStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
}

// Scheduled task representation
export interface ScheduledTask {
  handId: string;
  instanceId: string;
  scheduledTime: Date;
  priority: Priority;
  retryCount: number;
}

// Task execution result
export interface TaskExecutionResult {
  task: ScheduledTask;
  success: boolean;
  result?: unknown;
  error?: Error;
  duration: number;
  retryAttempt: number;
}

// Scheduler events
export type SchedulerEvent =
  | { type: "task_started"; task: ScheduledTask }
  | { type: "task_completed"; task: ScheduledTask; result: TaskExecutionResult }
  | { type: "task_failed"; task: ScheduledTask; error: Error; result?: TaskExecutionResult }
  | { type: "task_retry"; task: ScheduledTask; attempt: number }
  | { type: "schedule_updated"; handId: string }
  | { type: "scheduler_started" }
  | { type: "scheduler_stopped" };

// Priority level numeric value for ordering
export const PriorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
