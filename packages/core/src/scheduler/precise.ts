import type { ScheduledTask, TaskContext, TaskResult } from './types.js';
import { WakePriority } from './types.js';

export interface PreciseTimerConfig {
  driftCorrection: boolean;
  maxDriftMs: number;
  onDrift?: (driftMs: number) => void;
}

const DEFAULT_PRECISE_CONFIG: PreciseTimerConfig = {
  driftCorrection: true,
  maxDriftMs: 1000,
};

export class PreciseScheduler {
  private config: PreciseTimerConfig;
  private scheduledTasks: Map<string, {
    task: ScheduledTask;
    nextRun: number;
    timerId: ReturnType<typeof setTimeout> | null;
    expectedTime: number;
    driftAccumulator: number;
  }> = new Map();
  private running = false;

  constructor(config: Partial<PreciseTimerConfig> = {}) {
    this.config = { ...DEFAULT_PRECISE_CONFIG, ...config };
  }

  schedule(task: ScheduledTask): void {
    if (this.scheduledTasks.has(task.id)) {
      this.cancel(task.id);
    }

    const now = Date.now();
    const interval = task.intervalMs ?? 60000;
    const nextRun = now + interval;

    this.scheduledTasks.set(task.id, {
      task,
      nextRun,
      timerId: null,
      expectedTime: nextRun,
      driftAccumulator: 0,
    });

    if (this.running) {
      this.scheduleNextRun(task.id);
    }
  }

  cancel(taskId: string): boolean {
    const entry = this.scheduledTasks.get(taskId);
    if (!entry) return false;

    if (entry.timerId) {
      clearTimeout(entry.timerId);
    }
    this.scheduledTasks.delete(taskId);
    return true;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const taskId of this.scheduledTasks.keys()) {
      this.scheduleNextRun(taskId);
    }
  }

  stop(): void {
    this.running = false;
    for (const entry of this.scheduledTasks.values()) {
      if (entry.timerId) {
        clearTimeout(entry.timerId);
      }
    }
  }

  private scheduleNextRun(taskId: string): void {
    const entry = this.scheduledTasks.get(taskId);
    if (!entry || !this.running) return;

    const now = Date.now();
    const interval = entry.task.intervalMs ?? 60000;

    let delay = entry.nextRun - now;

    if (delay <= 0) {
      delay = 0;
      if (this.config.driftCorrection) {
        const drift = now - entry.expectedTime;
        entry.driftAccumulator += drift;

        if (Math.abs(drift) > this.config.maxDriftMs) {
          this.config.onDrift?.(drift);
        }

        const correction = Math.min(entry.driftAccumulator, interval * 0.1);
        entry.nextRun = now + interval - correction;
        delay = Math.max(0, entry.nextRun - now);
      } else {
        entry.nextRun = now + interval;
      }
    }

    entry.expectedTime = now + delay;
    entry.timerId = setTimeout(() => this.executeTask(taskId), delay);
  }

  private async executeTask(taskId: string): Promise<void> {
    const entry = this.scheduledTasks.get(taskId);
    if (!entry || !entry.task.enabled) {
      this.scheduleNextRun(taskId);
      return;
    }

    const startTime = Date.now();
    const ctx: TaskContext = {
      taskId: entry.task.id,
      taskName: entry.task.name,
      scheduledAt: startTime,
      triggeredBy: 'schedule',
    };

    try {
      await entry.task.handler(ctx);
    } catch {
      void 0;
    }

    entry.task.lastRun = startTime;
    const interval = entry.task.intervalMs ?? 60000;
    entry.nextRun = Date.now() + interval;

    this.scheduleNextRun(taskId);
  }

  getNextRun(taskId: string): number | undefined {
    return this.scheduledTasks.get(taskId)?.nextRun;
  }

  getExpectedDrift(taskId: string): number | undefined {
    return this.scheduledTasks.get(taskId)?.driftAccumulator;
  }
}

export interface ActiveHoursConfig {
  start: string;
  end: string;
  timezone?: string;
  skipWeekends?: boolean;
}

export function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function isInActiveWindow(config: ActiveHoursConfig, now?: Date): boolean {
  const currentTime = now ?? new Date();
  
  if (config.timezone) {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const timeStr = currentTime.toLocaleTimeString('en-US', options);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    
    const startMinutes = parseTimeToMinutes(config.start);
    const endMinutes = parseTimeToMinutes(config.end);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = parseTimeToMinutes(config.start);
  const endMinutes = parseTimeToMinutes(config.end);

  if (config.skipWeekends) {
    const dayOfWeek = currentTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
  }

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

export function getNextActiveTime(config: ActiveHoursConfig, now?: Date): Date {
  const currentTime = now ?? new Date();
  const startMinutes = parseTimeToMinutes(config.start);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  if (isInActiveWindow(config, currentTime)) {
    return currentTime;
  }

  const nextActive = new Date(currentTime);

  if (currentMinutes < startMinutes) {
    const [hours, minutes] = config.start.split(':').map(Number);
    nextActive.setHours(hours, minutes, 0, 0);
  } else {
    nextActive.setDate(nextActive.getDate() + 1);
    const [hours, minutes] = config.start.split(':').map(Number);
    nextActive.setHours(hours, minutes, 0, 0);
  }

  if (config.skipWeekends) {
    const dayOfWeek = nextActive.getDay();
    if (dayOfWeek === 0) {
      nextActive.setDate(nextActive.getDate() + 1);
    } else if (dayOfWeek === 6) {
      nextActive.setDate(nextActive.getDate() + 2);
    }
  }

  return nextActive;
}

export class ActiveHoursAwareScheduler {
  private config: ActiveHoursConfig;
  private active: boolean = true;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private onActiveChange?: (active: boolean) => void;

  constructor(config: ActiveHoursConfig, onActiveChange?: (active: boolean) => void) {
    this.config = config;
    this.onActiveChange = onActiveChange;
    this.updateActiveState();
  }

  startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.updateActiveState();
    }, 60000);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private updateActiveState(): void {
    const wasActive = this.active;
    this.active = isInActiveWindow(this.config);

    if (wasActive !== this.active && this.onActiveChange) {
      this.onActiveChange(this.active);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getNextActiveTime(): Date {
    return getNextActiveTime(this.config);
  }

  getConfig(): ActiveHoursConfig {
    return { ...this.config };
  }
}

export function createPreciseScheduler(config?: Partial<PreciseTimerConfig>): PreciseScheduler {
  return new PreciseScheduler(config);
}

export function createActiveHoursScheduler(
  config: ActiveHoursConfig,
  onActiveChange?: (active: boolean) => void
): ActiveHoursAwareScheduler {
  return new ActiveHoursAwareScheduler(config, onActiveChange);
}
