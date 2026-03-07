import type {
  Channel,
  ChannelConfig,
  ChannelMessage,
  ChannelResponse,
  ChannelContext,
  ChannelStats,
  ChannelType,
} from "./types.js";

export abstract class BaseChannel implements Channel {
  abstract type: ChannelType;
  config: ChannelConfig;
  protected connected = false;
  protected messageCallbacks: Array<(message: ChannelMessage) => void> = [];
  protected stats: ChannelStats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    lastActivity: 0,
  };

  constructor(config: ChannelConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: ChannelResponse, context: ChannelContext): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  onMessage(callback: (message: ChannelMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  protected emitMessage(message: ChannelMessage): void {
    this.stats.messagesReceived++;
    this.stats.lastActivity = Date.now();

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

  protected recordSend(): void {
    this.stats.messagesSent++;
    this.stats.lastActivity = Date.now();
  }

  protected recordError(): void {
    this.stats.errors++;
  }
}
