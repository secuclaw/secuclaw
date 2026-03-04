import { BaseChannel } from "./base.js";
import type { ChannelConfig, ChannelMessage, ChannelResponse, ChannelContext, ChannelAttachment } from "./types.js";

export interface TelegramConfig extends ChannelConfig {
  type: "telegram";
  token: string;
  chatId?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
    date: number;
  };
}

interface TelegramResponse {
  ok: boolean;
  result?: TelegramUpdate[] | { id: number } | unknown;
  description?: string;
}

export class TelegramChannel extends BaseChannel {
  type = "telegram" as const;
  private token: string;
  private chatId?: string;
  private parseMode: "HTML" | "Markdown" | "MarkdownV2";
  private pollingInterval?: ReturnType<typeof setInterval>;

  constructor(config: TelegramConfig) {
    super(config);
    this.token = config.token;
    this.chatId = config.chatId;
    this.parseMode = config.parseMode ?? "HTML";
  }

  async connect(): Promise<void> {
    if (!this.token) {
      throw new Error("Telegram token is required");
    }

    const me = await this.apiRequest("getMe");
    if (!me.ok) {
      throw new Error(`Telegram connection failed: ${me.description}`);
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
    const rawChatId = context.metadata?.chatId ?? this.chatId;
    const chatId = typeof rawChatId === "string" ? rawChatId : this.chatId;
    if (!chatId) {
      throw new Error("No chat ID specified");
    }

    const text = this.formatMessage(message);

    const response = await this.apiRequest("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: this.parseMode,
      reply_to_message_id: message.replyTo ? parseInt(message.replyTo, 10) : undefined,
    });

    if (!response.ok) {
      this.recordError();
      throw new Error(`Telegram send failed: ${response.description}`);
    }

    this.recordSend();

    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        await this.sendAttachment(attachment, chatId);
      }
    }
  }

  private async sendAttachment(
    attachment: ChannelAttachment,
    chatId: string,
  ): Promise<void> {
    if (attachment.type === "image" && attachment.url) {
      await this.apiRequest("sendPhoto", {
        chat_id: chatId,
        photo: attachment.url,
      });
    } else if (attachment.type === "file" && attachment.url) {
      await this.apiRequest("sendDocument", {
        chat_id: chatId,
        document: attachment.url,
      });
    }
  }

  private startPolling(): void {
    let lastUpdateId = 0;

    this.pollingInterval = setInterval(async () => {
      try {
        const response = await this.apiRequest("getUpdates", {
          offset: lastUpdateId + 1,
          timeout: 10,
        });

        if (response.ok && response.result && Array.isArray(response.result)) {
          for (const update of response.result as TelegramUpdate[]) {
            lastUpdateId = update.update_id;

            if (update.message) {
              const msg = update.message;
              this.emitMessage({
                id: msg.message_id.toString(),
                channelId: msg.chat.id.toString(),
                channelType: "telegram",
                userId: msg.from?.id.toString() ?? "unknown",
                content: msg.text ?? "",
                timestamp: msg.date * 1000,
                metadata: {
                  chatId: msg.chat.id,
                  username: msg.from?.username,
                  firstName: msg.from?.first_name,
                },
              });
            }
          }
        }
      } catch {
        this.recordError();
      }
    }, 1000);
  }

  private formatMessage(message: ChannelResponse): string {
    let text = message.content;

    if (this.parseMode === "HTML") {
      text = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    return text;
  }

  private async apiRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: unknown; description?: string }> {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
    });

    return response.json() as Promise<TelegramResponse>;
  }
}

export function createTelegramChannel(config: TelegramConfig): TelegramChannel {
  return new TelegramChannel(config);
}
