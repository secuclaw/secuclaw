import { ChannelStatus } from "./types.js";
import type {
  Channel,
  ChannelConfig,
  ChannelMessage,
  ChannelResponse,
  ChannelContext,
  ChannelStats,
  ChannelMetrics,
  ChannelType,
  HealthResult,
  UnifiedMessage,
} from "./types.js";

export abstract class BaseChannel implements Channel {
  abstract type: ChannelType;
  startTyping?(chatId: string): Promise<void>;
  stopTyping?(chatId: string): Promise<void>;
  config: ChannelConfig;
  protected connected = false;
  protected status: ChannelStatus = ChannelStatus.CREATED;
  private readonly startedAt = Date.now();
  protected messageCallbacks: Array<(message: ChannelMessage) => void> = [];
  protected stats: ChannelStats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    lastActivity: 0,
  };
  protected metrics: ChannelMetrics = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    lastActivity: 0,
    uptimeMs: 0,
    healthCheckSuccesses: 0,
    healthCheckFailures: 0,
  };

  constructor(config: ChannelConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: ChannelResponse, context: ChannelContext): Promise<void>;

  async sendMessage(message: UnifiedMessage): Promise<string> {
    await this.send(
      {
        content: message.content,
        attachments: message.attachments,
        metadata: message.metadata,
      },
      {
        channelId: message.channelId,
        userId: message.from.id,
        sessionId: `session-${message.id}`,
        metadata: {
          ...(message.metadata ?? {}),
          to: message.to,
        },
      },
    );
    return message.id;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onMessage(callback: (message: ChannelMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  protected emitMessage(message: ChannelMessage): void {
    this.stats.messagesReceived++;
    this.stats.lastActivity = Date.now();
    this.metrics.messagesReceived++;
    this.metrics.lastActivity = this.stats.lastActivity;

    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch {
        this.stats.errors++;
      }
    }
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  getStats(): ChannelStats {
    return { ...this.stats };
  }

  getStatus(): ChannelStatus {
    if (this.status === ChannelStatus.ERROR) {
      return this.status;
    }
    if (this.connected) {
      return this.status === ChannelStatus.CONNECTED ? ChannelStatus.CONNECTED : ChannelStatus.READY;
    }
    if (this.status === ChannelStatus.CREATED) {
      return ChannelStatus.CREATED;
    }
    return ChannelStatus.DISCONNECTED;
  }

  getMetrics(): ChannelMetrics {
    return {
      ...this.metrics,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  async healthCheck(): Promise<HealthResult> {
    const started = Date.now();
    const status = this.getStatus();
    const ok = status === ChannelStatus.CONNECTED || status === ChannelStatus.READY;
    if (ok) {
      this.metrics.healthCheckSuccesses++;
    } else {
      this.metrics.healthCheckFailures++;
    }

    return {
      ok,
      status,
      checkedAt: Date.now(),
      latencyMs: Date.now() - started,
      details: {
        connected: this.connected,
      },
    };
  }

  protected recordSend(): void {
    this.stats.messagesSent++;
    this.stats.lastActivity = Date.now();
    this.metrics.messagesSent++;
    this.metrics.lastActivity = this.stats.lastActivity;
  }

  protected recordError(): void {
    this.stats.errors++;
    this.metrics.errors++;
    this.metrics.lastErrorAt = Date.now();
  }

  protected setStatus(status: ChannelStatus): void {
    this.status = status;
  }
}
