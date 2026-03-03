export * from "./types.js";
export * from "./heartbeat.js";
export * from "./wake.js";
export * from "./tasks.js";
export * from "./integrated.js";

import { HeartbeatRunner } from "./heartbeat.js";
import { TaskManager } from "./tasks.js";
import { IntegratedScheduler, createIntegratedScheduler } from "./integrated.js";
import type { HeartbeatConfig, WakeConfig, SchedulerConfig } from "./types.js";

export class Scheduler {
  private heartbeat: HeartbeatRunner;
  private tasks: TaskManager;

  constructor(config: { heartbeat?: Partial<HeartbeatConfig>; wake?: Partial<WakeConfig> } = {}) {
    this.heartbeat = new HeartbeatRunner(config.heartbeat);
    this.tasks = new TaskManager();
  }

  start(): void {
    this.heartbeat.start();
  }

  stop(): void {
    this.heartbeat.stop();
    this.tasks.clearAll();
  }

  getHeartbeat(): HeartbeatRunner {
    return this.heartbeat;
  }

  getTasks(): TaskManager {
    return this.tasks;
  }
}

export { IntegratedScheduler, createIntegratedScheduler };
