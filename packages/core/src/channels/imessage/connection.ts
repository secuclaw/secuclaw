import { BaseChannel } from "../base.js";
import type {
  ChannelConfig,
  ChannelMessage,
  ChannelResponse,
  ChannelContext,
  ChannelAttachment,
} from "../types.js";
import type {
  IMessageConfig,
  IMessageMessage,
  BlueBubblesResponse,
  BlueBubblesChat,
  BlueBubblesMessage,
  IMessageSendOptions,
  IMessageConnectionState,
} from "./types.js";

/**
 * iMessage channel implementation via BlueBubbles REST API
 */
export class IMessageChannel extends BaseChannel {
  type = "imessage" as const;

  private serverUrl: string;
  private password: string;
  private defaultChatGuid?: string;
  private usePrivateApi: boolean;
  private timeout: number;
  private connectionState: IMessageConnectionState = "disconnected";

  constructor(config: IMessageConfig) {
    const channelConfig: ChannelConfig = {
      type: "imessage",
      enabled: config.enabled ?? true,
      token: config.password,
    };
    super(channelConfig);

    this.serverUrl = config.serverUrl.replace(/\/$/, "");
    this.password = config.password;
    this.defaultChatGuid = config.defaultChatGuid;
    this.usePrivateApi = config.usePrivateApi ?? false;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Connect to BlueBubbles server
   */
  async connect(): Promise<void> {
    this.connectionState = "connecting";

    try {
      const response = await this.request<{ message: string }>("/ping");

      if (response.status === 200 || response.status === 0) {
        this.connected = true;
        this.connectionState = "connected";
      } else {
        throw new Error(response.message || "Failed to connect to BlueBubbles server");
      }
    } catch (error) {
      this.connectionState = "error";
      throw new Error(
        `Failed to connect to BlueBubbles server: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Disconnect from BlueBubbles server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.connectionState = "disconnected";
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): IMessageConnectionState {
    return this.connectionState;
  }

  /**
   * Send a message via iMessage
   */
  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const chatGuid = (context.metadata?.chatGuid as string) ?? this.defaultChatGuid;

    if (!chatGuid) {
      throw new Error("No chat GUID specified. Provide chatGuid in metadata or set defaultChatGuid in config.");
    }

    const options: IMessageSendOptions = {
      chatGuid,
      text: message.content,
      attachments: message.attachments?.map((att) => ({
        source: att.url ?? "",
        data: att.data,
        mimeType: att.mimeType,
        filename: att.filename,
      })),
    };

    await this.sendMessageWithOptions(options);
  }

  /**
   * Send a message with full options
   */
  async sendMessageWithOptions(options: IMessageSendOptions): Promise<string> {
    const chatGuid = options.chatGuid ?? this.defaultChatGuid;

    if (!chatGuid) {
      throw new Error("No chat GUID specified");
    }

    if (options.attachments && options.attachments.length > 0) {
      return this.sendMessageWithAttachment(chatGuid, options);
    }

    const payload: Record<string, unknown> = {
      chatGuid,
      message: options.text,
    };

    if (options.subject) {
      payload.subject = options.subject;
    }

    if (options.replyGuid) {
      payload.replyGuid = options.replyGuid;
    }

    if (options.effect) {
      payload.effect = options.effect;
    }

    const response = await this.request<{ message: { guid: string } }>(
      "/message/text",
      "POST",
      payload
    );

    if (response.status !== 200) {
      throw new Error(response.error?.error ?? response.message ?? "Failed to send message");
    }

    return response.data?.message.guid ?? "";
  }

  /**
   * Send a message with attachment
   */
  private async sendMessageWithAttachment(
    chatGuid: string,
    options: IMessageSendOptions
  ): Promise<string> {
    const formData = new FormData();
    formData.append("chatGuid", chatGuid);
    formData.append("message", options.text ?? "");

    if (options.subject) {
      formData.append("subject", options.subject);
    }

    if (options.replyGuid) {
      formData.append("replyGuid", options.replyGuid);
    }

    if (options.effect) {
      formData.append("effect", options.effect);
    }

    // Add attachments
    for (const attachment of options.attachments ?? []) {
      if (attachment.data) {
        // Convert Buffer to Uint8Array for Blob compatibility
        const uint8Array = new Uint8Array(attachment.data);
        const blob = new Blob([uint8Array]);
        const filename = attachment.filename ?? "attachment";
        formData.append("attachment", blob, filename);
      }
    }

    const url = `${this.serverUrl}/api/v1/message/attachment?guid=${this.password}`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as BlueBubblesResponse<{ message: { guid: string } }>;

    if (data.status !== 200) {
      throw new Error(data.error?.error ?? data.message ?? "Failed to send attachment");
    }

    return data.data?.message.guid ?? "";
  }

  /**
   * Get list of chats
   */
  async getChats(): Promise<BlueBubblesChat[]> {
    const response = await this.request<{ chats: BlueBubblesChat[] }>("/chat");

    if (response.status !== 200) {
      throw new Error(response.error?.error ?? response.message ?? "Failed to get chats");
    }

    return response.data?.chats ?? [];
  }

  /**
   * Get messages from a chat
   */
  async getMessages(chatGuid: string, limit = 50): Promise<BlueBubblesMessage[]> {
    const response = await this.request<{ messages: BlueBubblesMessage[] }>(
      `/chat/${encodeURIComponent(chatGuid)}/message?limit=${limit}`
    );

    if (response.status !== 200) {
      throw new Error(response.error?.error ?? response.message ?? "Failed to get messages");
    }

    return response.data?.messages ?? [];
  }

  /**
   * Mark a chat as read
   */
  async markAsRead(chatGuid: string): Promise<void> {
    const response = await this.request(`/chat/${encodeURIComponent(chatGuid)}/read`, "POST");

    if (response.status !== 200) {
      throw new Error(response.error?.error ?? response.message ?? "Failed to mark as read");
    }
  }

  /**
   * Get a single message by GUID
   */
  async getMessage(chatGuid: string, messageGuid: string): Promise<BlueBubblesMessage | null> {
    const response = await this.request<{ message: BlueBubblesMessage }>(
      `/chat/${encodeURIComponent(chatGuid)}/message/${encodeURIComponent(messageGuid)}`
    );

    if (response.status !== 200) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(response.error?.error ?? response.message ?? "Failed to get message");
    }

    return response.data?.message ?? null;
  }

  /**
   * Delete a message
   */
  async deleteMessage(chatGuid: string, messageGuid: string): Promise<void> {
    const response = await this.request(
      `/chat/${encodeURIComponent(chatGuid)}/message/${encodeURIComponent(messageGuid)}`,
      "DELETE"
    );

    if (response.status !== 200) {
      throw new Error(response.error?.error ?? response.message ?? "Failed to delete message");
    }
  }

  /**
   * Start listening for incoming messages (webhook-based)
   * Note: For production, set up a webhook endpoint
  async startMessageListener(callback: (message: IMessageMessage) => void): Promise<void> {
    // This is a placeholder - in production, you'd set up a webhook server
    // or poll for new messages
    this.onMessage((msg) => {
      callback(msg as unknown as IMessageMessage);
    });
  }
  async startMessageListener(callback: (message: IMessageMessage) => void): Promise<void> {
    // This is a placeholder - in production, you'd set up a webhook server
    // or poll for new messages
    this.onMessage((msg) => {
      callback(msg as IMessageMessage);
    });
  }

  /**
   * Handle incoming webhook from BlueBubbles
   */
  handleWebhook(payload: { event: string; data: BlueBubblesMessage }): void {
    if (payload.event === "new-message") {
      const message = payload.data;
      const channelMessage: ChannelMessage = {
        id: message.guid,
        channelId: message.chatGuid,
        channelType: "imessage",
        userId: message.handle?.address ?? "unknown",
        content: message.text ?? "",
        timestamp: message.dateCreated,
        metadata: {
          isFromMe: message.isFromMe,
          chatGuid: message.chatGuid,
          subject: message.subject,
          attachments: message.attachments,
          handle: message.handle,
        },
      };

      this.emitMessage(channelMessage);
    }
  }

  /**
   * Make an API request to BlueBubbles
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: Record<string, unknown>
  ): Promise<BlueBubblesResponse<T>> {
    const url = `${this.serverUrl}/api/v1${endpoint}${endpoint.includes("?") ? "&" : "?"}guid=${this.password}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return (await response.json()) as BlueBubblesResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }

      throw new Error("Unknown error occurred");
    }
  }
}

/**
 * Factory function to create an iMessage channel
 */
export function createIMessageChannel(config: IMessageConfig): IMessageChannel {
  return new IMessageChannel(config);
}
