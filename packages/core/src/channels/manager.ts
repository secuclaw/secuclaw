import type {
  Channel,
  ChannelConfig,
  ChannelMessage,
  ChannelResponse,
  ChannelContext,
  ChannelManagerOptions,
  ChannelType,
} from "./types.js";
import { TelegramChannel, type TelegramConfig } from "./telegram.js";
import { DiscordChannel, type DiscordConfig } from "./discord.js";
import { SlackChannel, type SlackConfig } from "./slack.js";
import { WebChannel, type WebConfig } from "./web.js";
import { FeishuChannel, type FeishuConfig } from "./feishu.js";

export class ChannelManager {
  private channels: Map<ChannelType, Channel> = new Map();
  private messageCallbacks: Array<(message: ChannelMessage) => void> = [];
  private defaultChannel: ChannelType;

  constructor(options: ChannelManagerOptions) {
    this.defaultChannel = options.defaultChannel ?? "web";

    for (const config of options.channels) {
      if (config.enabled !== false) {
        this.registerChannel(config);
      }
    }
  }

  private registerChannel(config: ChannelConfig): void {
    let channel: Channel;

    switch (config.type) {
      case "telegram":
        channel = new TelegramChannel(config as TelegramConfig);
        break;
      case "discord":
        channel = new DiscordChannel(config as DiscordConfig);
        break;
      case "slack":
        channel = new SlackChannel(config as SlackConfig);
        break;
      case "web":
        channel = new WebChannel(config as WebConfig);
        break;
      case "feishu":
        channel = new FeishuChannel(config as FeishuConfig);
        break;
      default:
        throw new Error(`Unknown channel type: ${config.type}`);
    }

    channel.onMessage((message) => {
      this.emitMessage(message);
    });

    this.channels.set(config.type, channel);
  }

  async connectAll(): Promise<void> {
    const errors: Error[] = [];

    for (const [type, channel] of this.channels) {
      try {
        await channel.connect();
      } catch (error) {
        errors.push(new Error(`Failed to connect ${type}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "Some channels failed to connect");
    }
  }

  async disconnectAll(): Promise<void> {
    for (const channel of this.channels.values()) {
      try {
        await channel.disconnect();
      } catch {
      }
    }
  }

  getChannel(type: ChannelType): Channel | undefined {
    return this.channels.get(type);
  }

  getDefaultChannel(): Channel | undefined {
    return this.channels.get(this.defaultChannel);
  }

  getConnectedChannels(): ChannelType[] {
    const connected: ChannelType[] = [];
    for (const [type, channel] of this.channels) {
      if (channel.isConnected()) {
        connected.push(type);
      }
    }
    return connected;
  }

  async send(
    message: ChannelResponse,
    context: ChannelContext,
    channelType?: ChannelType,
  ): Promise<void> {
    const type = channelType ?? this.defaultChannel;
    const channel = this.channels.get(type);

    if (!channel) {
      throw new Error(`Channel not found: ${type}`);
    }

    if (!channel.isConnected()) {
      throw new Error(`Channel not connected: ${type}`);
    }

    await channel.send(message, context);
  }

  async broadcast(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const errors: Error[] = [];

    for (const [type, channel] of this.channels) {
      if (channel.isConnected()) {
        try {
          await channel.send(message, context);
        } catch (error) {
          errors.push(new Error(`Failed to send to ${type}: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }

    if (errors.length === this.channels.size) {
      throw new AggregateError(errors, "All channels failed to send");
    }
  }

  onMessage(callback: (message: ChannelMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  private emitMessage(message: ChannelMessage): void {
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch {
      }
    }
  }

  getWebChannel(): WebChannel | undefined {
    return this.channels.get("web") as WebChannel | undefined;
  }

  getStats(): Record<ChannelType, { connected: boolean }> {
    const stats: Record<ChannelType, { connected: boolean }> = {} as Record<ChannelType, { connected: boolean }>;

    for (const [type, channel] of this.channels) {
      stats[type] = { connected: channel.isConnected() };
    }

    return stats;
  }
}

export function createChannelManager(options: ChannelManagerOptions): ChannelManager {
  return new ChannelManager(options);
}
