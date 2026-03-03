import { BaseChannel } from "./base.js";
import type { ChannelConfig, ChannelMessage, ChannelResponse, ChannelContext } from "./types.js";

export interface DiscordConfig extends ChannelConfig {
  type: "discord";
  token: string;
  channelId?: string;
  applicationId?: string;
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: { id: string; username: string };
  content: string;
  timestamp: string;
  referenced_message?: { id: string };
}

interface DiscordInteraction {
  id: string;
  token: string;
  type: number;
  data?: { name: string; options?: Array<{ name: string; value: unknown }> };
  channel_id: string;
  user: { id: string; username: string };
}

export class DiscordChannel extends BaseChannel {
  type = "discord" as const;
  private token: string;
  private channelId?: string;
  private applicationId?: string;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private lastSequence: number | null = null;

  constructor(config: DiscordConfig) {
    super(config);
    this.token = config.token;
    this.channelId = config.channelId;
    this.applicationId = config.applicationId;
  }

  async connect(): Promise<void> {
    if (!this.token) {
      throw new Error("Discord token is required");
    }

    const user = await this.apiRequest("GET", "/users/@me");
    if (!user.id) {
      throw new Error("Discord connection failed: invalid token");
    }

    this.startPolling();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.connected = false;
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const rawChannelId = context.metadata?.channelId ?? this.channelId;
    const targetChannelId = typeof rawChannelId === "string" ? rawChannelId : this.channelId;
    if (!targetChannelId) {
      throw new Error("No channel ID specified");
    }

    const body: Record<string, unknown> = {
      content: message.content,
    };

    if (message.replyTo) {
      body.message_reference = {
        message_id: message.replyTo,
        channel_id: targetChannelId,
      };
    }

    const response = await this.apiRequest("POST", `/channels/${targetChannelId}/messages`, body);

    if (!response.id) {
      this.recordError();
      throw new Error("Discord send failed");
    }

    this.recordSend();
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          limit: "100",
        });
        
        if (this.lastSequence !== null) {
          params.set("after", this.lastSequence.toString());
        }

        const messages = await this.apiRequest(
          "GET",
          `/channels/${this.channelId}/messages?${params.toString()}`,
        );

        if (Array.isArray(messages)) {
          for (const msg of messages.reverse()) {
            this.lastSequence = parseInt(msg.id, 10);
            this.processMessage(msg as DiscordMessage);
          }
        }
      } catch {
        this.recordError();
      }
    }, 2000);
  }

  private processMessage(msg: DiscordMessage): void {
    if (!msg.content) return;

    this.emitMessage({
      id: msg.id,
      channelId: msg.channel_id,
      channelType: "discord",
      userId: msg.author.id,
      content: msg.content,
      timestamp: new Date(msg.timestamp).getTime(),
      replyTo: msg.referenced_message?.id,
      metadata: {
        username: msg.author.username,
      },
    });
  }

  private async apiRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `https://discord.com/api/v10${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bot ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    if (response.status === 204) {
      return {};
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}

export function createDiscordChannel(config: DiscordConfig): DiscordChannel {
  return new DiscordChannel(config);
}
