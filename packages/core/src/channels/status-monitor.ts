import { EventEmitter } from "node:events";
import type { BaseChannel } from "./base.js";
import type { ChannelStatus, HealthResult } from "./types.js";

export interface StatusChangeEvent {
  channelId: string;
  previous: ChannelStatus;
  current: ChannelStatus;
  health: HealthResult;
}

export interface StatusMonitorTarget {
  getAll(): BaseChannel[];
}

export class StatusMonitor extends EventEmitter {
  private readonly target: StatusMonitorTarget;
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly lastStatuses = new Map<string, ChannelStatus>();

  constructor(target: StatusMonitorTarget, intervalMs: number = 15_000) {
    super();
    this.target = target;
    this.intervalMs = intervalMs;
  }

  startMonitoring(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.poll();
    }, this.intervalMs);
  }

  stopMonitoring(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  onStatusChange(handler: (event: StatusChangeEvent) => void): () => void {
    this.on("status-change", handler);
    return () => {
      this.off("status-change", handler);
    };
  }

  async poll(): Promise<void> {
    for (const channel of this.target.getAll()) {
      const health = await channel.healthCheck();
      const channelId = this.resolveChannelId(channel);
      const previous = this.lastStatuses.get(channelId);
      const current = health.status;
      this.lastStatuses.set(channelId, current);
      if (previous && previous !== current) {
        const event: StatusChangeEvent = {
          channelId,
          previous,
          current,
          health,
        };
        this.emit("status-change", event);
      }
    }
  }

  private resolveChannelId(channel: BaseChannel): string {
    return channel.config.channelId ?? channel.config.botId ?? channel.type;
  }
}
