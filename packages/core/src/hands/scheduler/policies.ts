import { Cron } from "croner";
import type { RetryPolicy, SchedulePolicy } from "./types.js";

export function calculateBackoff(policy: RetryPolicy, attempt: number): number {
  let delay: number;

  switch (policy.backoff) {
    case "exponential":
      delay = policy.baseDelay * Math.pow(2, attempt);
      break;
    case "linear":
      delay = policy.baseDelay * (attempt + 1);
      break;
    case "fixed":
    default:
      delay = policy.baseDelay;
      break;
  }

  return Math.min(delay, policy.maxDelay);
}

export function calculateNextRun(policy: SchedulePolicy, lastRun?: Date): Date {
  const now = new Date();

  if (policy.cron) {
    try {
      const cronJob = new Cron(policy.cron);
      const nextRun = cronJob.nextRun();
      if (nextRun) {
        return nextRun;
      }
    } catch {
      // Invalid cron expression, fall through to interval
    }
  }

  if (policy.intervalMs) {
    const baseTime = lastRun ?? now;
    return new Date(baseTime.getTime() + policy.intervalMs);
  }

  if (policy.delayMs) {
    const baseTime = lastRun ?? now;
    return new Date(baseTime.getTime() + policy.delayMs);
  }

  return new Date(now.getTime() + 60000);
}

export function isDue(config: { nextRun?: Date; enabled: boolean }): boolean {
  if (!config.enabled) {
    return false;
  }

  if (!config.nextRun) {
    return true;
  }

  return new Date() >= config.nextRun;
}

export function validateCronExpression(cron: string): boolean {
  try {
    new Cron(cron);
    return true;
  } catch {
    return false;
  }
}

export function getNextCronRun(cron: string): Date | null {
  try {
    const cronJob = new Cron(cron);
    return cronJob.nextRun();
  } catch {
    return null;
  }
}
