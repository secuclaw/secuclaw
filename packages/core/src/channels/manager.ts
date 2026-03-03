import { BaseChannel } from "./base.js";
import { TelegramChannel, type TelegramConfig } from "./telegram.js";
import { DiscordChannel, type DiscordConfig } from "./discord.js";
import { SlackChannel, type SlackConfig } from "./slack.js";
import { WebChannel, type WebConfig } from "./web.js";
import { FeishuChannel, type FeishuConfig } from "./feishu.js";
import { GoogleChatChannel, type GoogleChatConfig } from "./google-chat/index.js";
import { IMessageChannel as IMessageChannelImpl, type IMessageConfig } from "./imessage/index.js";
import { SignalChannel, type SignalConfig } from "./signal/index.js";
import { TeamsChannel, type TeamsConfig } from "./teams/index.js";
import { StatusMonitor } from "./status-monitor.js";
import { ChannelStatus } from "./types.js";
import type {
  Channel,
  ChannelConfig,
  ChannelContext,
  ChannelManagerOptions,
  ChannelMessage,
  ChannelMetrics,
  ChannelResponse,
  ChannelType,
  HealthResult,
  UnifiedMessage,
} from "./types.js";

function isUnifiedMessage(input: UnifiedMessage | ChannelResponse): input is UnifiedMessage {
  return typeof (input as UnifiedMessage).channelId === "string" && typeof (input as UnifiedMessage).id === "string";
}

export class ChannelManager {
  private readonly channelsById = new Map<string, BaseChannel>();
  private readonly channelsByType = new Map<ChannelType, Set<string>>();
  private readonly messageCallbacks: Array<(message: ChannelMessage) => void> = [];
  private readonly defaultChannel: ChannelType;
  private readonly statusMonitor: StatusMonitor;

  constructor(options: ChannelManagerOptions) {
    this.defaultChannel = options.defaultChannel ?? "web";

    for (const config of options.channels) {
      if (config.enabled !== false) {
        this.register(this.createChannel(config));
      }
    }

    this.statusMonitor = new StatusMonitor(this, options.monitorIntervalMs ?? 15_000);
  }

  register(channel: BaseChannel): void {
    const channelId = this.resolveChannelId(channel);
    this.channelsById.set(channelId, channel);

    const typed = this.channelsByType.get(channel.type) ?? new Set<string>();
    typed.add(channelId);
    this.channelsByType.set(channel.type, typed);

    channel.onMessage((message) => {
      this.emitMessage(message);
    });
  }

  unregister(channelId: string): void {
    const existing = this.channelsById.get(channelId);
    if (!existing) {
      return;
    }
    this.channelsById.delete(channelId);
    const typed = this.channelsByType.get(existing.type);
    if (!typed) {
      return;
    }
    typed.delete(channelId);
    if (typed.size === 0) {
      this.channelsByType.delete(existing.type);
    }
  }

  get(channelId: string): BaseChannel | undefined {
    return this.channelsById.get(channelId);
  }

  getAll(): BaseChannel[] {
    return Array.from(this.channelsById.values());
  }

  getByType(type: ChannelType): BaseChannel[] {
    const ids = this.channelsByType.get(type);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.channelsById.get(id))
      .filter((channel): channel is BaseChannel => Boolean(channel));
  }

  getStatus(channelId: string): ChannelStatus {
    const channel = this.channelsById.get(channelId);
    return channel?.getStatus() ?? ChannelStatus.DISCONNECTED;
  }

  getMetrics(channelId: string): ChannelMetrics {
    const channel = this.channelsById.get(channelId);
    if (channel) {
      return channel.getMetrics();
    }
    return {
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      lastActivity: 0,
      uptimeMs: 0,
      healthCheckSuccesses: 0,
      healthCheckFailures: 0,
    };
  }

  async connectAll(): Promise<void> {
    const errors: Error[] = [];

    for (const [id, channel] of this.channelsById) {
      try {
        await channel.connect();
      } catch (error) {
        errors.push(
          new Error(
            `Failed to connect ${id}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    }

    this.statusMonitor.startMonitoring();
    void this.statusMonitor.poll();

    if (errors.length > 0) {
      throw new AggregateError(errors, "Some channels failed to connect");
    }
  }

  async disconnectAll(): Promise<void> {
    this.statusMonitor.stopMonitoring();
    for (const channel of this.channelsById.values()) {
      try {
        await channel.disconnect();
      } catch {
        // keep disconnect idempotent
      }
    }
  }

  getChannel(type: ChannelType): Channel | undefined {
    return this.getByType(type)[0];
  }

  getDefaultChannel(): Channel | undefined {
    return this.getChannel(this.defaultChannel);
  }

  getConnectedChannels(): ChannelType[] {
    const connected = new Set<ChannelType>();
    for (const channel of this.channelsById.values()) {
      if (channel.isConnected()) {
        connected.add(channel.type);
      }
    }
    return Array.from(connected);
  }

  async send(
    message: ChannelResponse,
    context: ChannelContext,
    channelType?: ChannelType,
  ): Promise<void> {
    const type = channelType ?? this.defaultChannel;
    const channel = this.getChannel(type);

    if (!channel) {
      throw new Error(`Channel not found: ${type}`);
    }

    if (!channel.isConnected()) {
      throw new Error(`Channel not connected: ${type}`);
    }

    await channel.send(message, context);
  }

  async broadcast(message: UnifiedMessage | ChannelResponse, context?: ChannelContext): Promise<void> {
    const errors: Error[] = [];
    let sent = 0;

    for (const [id, channel] of this.channelsById) {
      if (!channel.isConnected()) {
        continue;
      }

      try {
        if (isUnifiedMessage(message)) {
          await channel.sendMessage({
            ...message,
            channelId: id,
            channelType: channel.type,
          });
        } else {
          if (!context) {
            throw new Error("Context is required for ChannelResponse broadcast");
          }
          await channel.send(message, context);
        }
        sent++;
      } catch (error) {
        errors.push(
          new Error(
            `Failed to send to ${id}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    }

    if (sent === 0 && errors.length > 0) {
      throw new AggregateError(errors, "All channels failed to send");
    }
  }

  async healthCheckAll(): Promise<Map<string, HealthResult>> {
    const results = new Map<string, HealthResult>();
    for (const [id, channel] of this.channelsById) {
      results.set(id, await channel.healthCheck());
    }
    return results;
  }

  onMessage(callback: (message: ChannelMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  getWebChannel(): WebChannel | undefined {
    const channel = this.getChannel("web");
    return channel instanceof WebChannel ? channel : undefined;
  }

  getStats(): Partial<Record<ChannelType, { connected: boolean }>> {
    const stats: Partial<Record<ChannelType, { connected: boolean }>> = {};
    for (const channel of this.channelsById.values()) {
      stats[channel.type] = {
        connected: channel.isConnected(),
      };
    }
    return stats;
  }

  private emitMessage(message: ChannelMessage): void {
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch {
        // user callback errors are isolated
      }
    }
  }

  private createChannel(config: ChannelConfig): BaseChannel {
    switch (config.type) {
      case "telegram":
        return new TelegramChannel(config as TelegramConfig);
      case "discord":
        return new DiscordChannel(config as DiscordConfig);
      case "slack":
        return new SlackChannel(config as SlackConfig);
      case "web":
        return new WebChannel(config as WebConfig);
      case "feishu":
        return new FeishuChannel(config as FeishuConfig);
      case "googlechat":
        return new GoogleChatChannel(config as GoogleChatConfig);
      case "imessage":
        return new IMessageChannelImpl(config as IMessageConfig);
      case "signal":
        return new SignalChannel(config as SignalConfig);
      case "teams":
        return new TeamsChannel(config as TeamsConfig);
      case "whatsapp":
        throw new Error("WhatsApp channel runtime dependency is not installed");
      case "cli":
        return new WebChannel({ ...config, type: "web" } as WebConfig);
      default:
        throw new Error(`Unknown channel type: ${config.type}`);
    }
  }

  private resolveChannelId(channel: BaseChannel): string {
    return channel.config.channelId ?? channel.config.botId ?? channel.type;
  }
}

export function createChannelManager(options: ChannelManagerOptions): ChannelManager {
  return new ChannelManager(options);
}
