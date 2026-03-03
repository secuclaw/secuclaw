import { BaseChannel } from "./base.js";
import type { ChannelConfig, ChannelMessage, ChannelResponse, ChannelContext } from "./types.js";

export interface SlackConfig extends ChannelConfig {
  type: "slack";
  token: string;
  channelId?: string;
  signingSecret?: string;
  appToken?: string;
}

interface SlackMessage {
  client_msg_id?: string;
  type: string;
  text?: string;
  user?: string;
  ts: string;
  channel?: string;
  thread_ts?: string;
}

interface SlackResponse {
  ok: boolean;
  error?: string;
  messages?: SlackMessage[];
  ts?: string;
}

export class SlackChannel extends BaseChannel {
  type = "slack" as const;
  private token: string;
  private channelId?: string;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private lastTimestamp: string = "";

  constructor(config: SlackConfig) {
    super(config);
    this.token = config.token;
    this.channelId = config.channelId;
  }

  async connect(): Promise<void> {
    if (!this.token) {
      throw new Error("Slack token is required");
    }

    const auth = await this.apiRequest("auth.test", {});
    if (!auth.ok) {
      throw new Error(`Slack connection failed: ${auth.error}`);
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
      channel: targetChannelId,
      text: message.content,
    };

    if (message.replyTo) {
      body.thread_ts = message.replyTo;
    }

    const response = await this.apiRequest("chat.postMessage", body);

    if (!response.ok) {
      this.recordError();
      throw new Error(`Slack send failed: ${response.error}`);
    }

    this.recordSend();
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const body: Record<string, unknown> = {
          channel: this.channelId,
          limit: 100,
        };

        if (this.lastTimestamp) {
          body.oldest = this.lastTimestamp;
        }

        const response = await this.apiRequest("conversations.history", body);

        if (response.ok && response.messages) {
          for (const msg of response.messages.reverse()) {
            this.lastTimestamp = msg.ts;
            this.processMessage(msg);
          }
        }
      } catch {
        this.recordError();
      }
    }, 2000);
  }

  private processMessage(msg: SlackMessage): void {
    if (!msg.text || !msg.user) return;

    this.emitMessage({
      id: msg.ts,
      channelId: msg.channel ?? this.channelId ?? "",
      channelType: "slack",
      userId: msg.user,
      content: msg.text,
      timestamp: parseFloat(msg.ts) * 1000,
      replyTo: msg.thread_ts,
      metadata: {
        clientMsgId: msg.client_msg_id,
      },
    });
  }

  private async apiRequest(
    method: string,
    body: Record<string, unknown>,
  ): Promise<SlackResponse> {
    const url = `https://slack.com/api/${method}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    return response.json() as Promise<SlackResponse>;
  }
}

export function createSlackChannel(config: SlackConfig): SlackChannel {
  return new SlackChannel(config);
}
