import { EventEmitter } from "node:events";
import { google, chat_v1 } from "googleapis";
import type { Auth } from "googleapis";

import { BaseChannel } from "../base.js";
import type { ChannelResponse, ChannelContext } from "../types.js";
import type {
  GoogleChatConfig,
  GoogleChatConnectionState,
  GoogleChatEventMap,
  GoogleChatCredentials,
  GoogleChatMessageEvent,
  GoogleChatCardV2,
  GoogleChatSendResult,
  GoogleChatMessageOptions,
} from "./types.js";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/chat.bot",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.spaces",
];

const RECONNECT_DELAY = 3000;
const DEFAULT_POLLING_INTERVAL = 2000;

export class GoogleChatChannel extends BaseChannel {
  type = "googlechat" as const;
  private oauth2Client: Auth.OAuth2Client | null = null;
  private chatClient: chat_v1.Chat | null = null;
  private connectionState: GoogleChatConnectionState = "disconnected";
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private eventEmitter: EventEmitter;
  private credentials: GoogleChatCredentials;
  private scopes: string[];
  private serviceAccountJson: string | undefined;
  private lastMessageTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: GoogleChatConfig) {
    super(config);
    this.credentials = config.credentials;
    this.scopes = config.scopes ?? DEFAULT_SCOPES;
    this.serviceAccountJson = config.serviceAccountJson;
    this.eventEmitter = new EventEmitter();
  }

  async connect(): Promise<void> {
    if (this.connectionState === "connected") {
      return;
    }

    this.setConnectionState("connecting");

    try {
      await this.initializeClient();
      await this.verifyConnection();
      
      this.startPolling();
      this.setConnectionState("connected");
      this.reconnectAttempts = 0;
      this.eventEmitter.emit("connected", undefined);
    } catch (error) {
      this.setConnectionState("error");
      this.recordError();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.oauth2Client = null;
    this.chatClient = null;
    this.setConnectionState("disconnected");
    this.reconnectAttempts = 0;
    this.eventEmitter.emit("disconnected", { reason: "manual_disconnect" });
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    if (this.connectionState !== "connected" || !this.chatClient) {
      throw new Error("Google Chat not connected");
    }

    const spaceId = this.getSpaceId(context);
    if (!spaceId) {
      throw new Error("No space ID specified");
    }

    try {
      const messageBody = this.buildMessageBody(message);
      
      const requestOptions: GoogleChatMessageOptions = {};
      if (context.metadata?.threadKey) {
        requestOptions.threadKey = context.metadata.threadKey as string;
      }
      if (context.metadata?.requestId) {
        requestOptions.requestId = context.metadata.requestId as string;
      }

      const parent = `spaces/${spaceId}`;
      
      const response = await this.chatClient.spaces.messages.create({
        parent,
        requestBody: messageBody,
        requestId: requestOptions.requestId ?? this.generateId(),
        ...(requestOptions.threadKey && { threadKey: requestOptions.threadKey }),
      });

      if (!response.data.name) {
        throw new Error("Failed to send message: no message name returned");
      }

      this.recordSend();
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  async sendToSpace(
    spaceId: string,
    message: string | GoogleChatCardV2[],
    options?: GoogleChatMessageOptions,
  ): Promise<GoogleChatSendResult> {
    if (this.connectionState !== "connected" || !this.chatClient) {
      throw new Error("Google Chat not connected");
    }

    const messageBody: chat_v1.Schema$Message = {};
    
    if (typeof message === "string") {
      messageBody.text = message;
    } else {
      messageBody.cardsV2 = message;
    }

    const parent = `spaces/${spaceId}`;
    
    const response = await this.chatClient.spaces.messages.create({
      parent,
      requestBody: messageBody,
      requestId: options?.requestId ?? this.generateId(),
      ...(options?.threadKey && { threadKey: options.threadKey }),
    });

    if (!response.data.name) {
      throw new Error("Failed to send message");
    }

    this.recordSend();

    return {
      name: response.data.name,
      space: spaceId,
      thread: options?.threadKey,
      createTime: response.data.createTime ?? undefined,
    };
  }

  async listSpaces(): Promise<chat_v1.Schema$Space[]> {
    if (this.connectionState !== "connected" || !this.chatClient) {
      throw new Error("Google Chat not connected");
    }

    const response = await this.chatClient.spaces.list({
      pageSize: 100,
    });

    return response.data.spaces ?? [];
  }

  async getSpace(spaceId: string): Promise<chat_v1.Schema$Space | null> {
    if (this.connectionState !== "connected" || !this.chatClient) {
      throw new Error("Google Chat not connected");
    }

    const response = await this.chatClient.spaces.get({
      name: `spaces/${spaceId}`,
    });

    return response.data;
  }

  async getMessage(spaceId: string, messageId: string): Promise<chat_v1.Schema$Message | null> {
    if (this.connectionState !== "connected" || !this.chatClient) {
      throw new Error("Google Chat not connected");
    }

    const response = await this.chatClient.spaces.messages.get({
      name: `spaces/${spaceId}/messages/${messageId}`,
    });

    return response.data;
  }

  getConnectionState(): GoogleChatConnectionState {
    return this.connectionState;
  }

  on<T extends keyof GoogleChatEventMap>(
    event: T,
    listener: (data: GoogleChatEventMap[T]) => void,
  ): void {
    this.eventEmitter.on(event, listener);
  }

  off<T extends keyof GoogleChatEventMap>(
    event: T,
    listener: (data: GoogleChatEventMap[T]) => void,
  ): void {
    this.eventEmitter.off(event, listener);
  }

  async reconnect(): Promise<void> {
    if (this.connectionState === "reconnecting") {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setConnectionState("error");
      throw new Error("Max reconnection attempts reached");
    }

    this.setConnectionState("reconnecting");
    this.reconnectAttempts++;

    await this.disconnect();

    await new Promise((resolve) => {
      this.reconnectTimeout = setTimeout(resolve, RECONNECT_DELAY);
    });

    await this.connect();
  }

  processWebhookEvent(event: GoogleChatMessageEvent): void {
    if (event.message) {
      this.emitMessage({
        id: event.message.name ?? this.generateId(),
        channelId: event.space?.name ?? "",
        channelType: "googlechat",
        userId: event.user?.name ?? event.user?.id ?? "",
        content: event.message.fallbackText ?? event.message.message?.text ?? "",
        timestamp: event.eventTime ? new Date(event.eventTime).getTime() : Date.now(),
        metadata: {
          space: event.space,
          thread: event.thread,
          message: event.message,
        },
      });
    }

    this.eventEmitter.emit("message", event);
  }

  private async initializeClient(): Promise<void> {
    this.oauth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
    );

    if (this.credentials.accessToken && this.credentials.expiryDate) {
      this.oauth2Client.setCredentials({
        access_token: this.credentials.accessToken,
        refresh_token: this.credentials.refreshToken,
        expiry_date: this.credentials.expiryDate,
      });
    } else if (this.credentials.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: this.credentials.refreshToken,
      });
    } else if (this.serviceAccountJson) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(this.serviceAccountJson),
          scopes: this.scopes,
        });
        this.oauth2Client = (await auth.getClient()) as Auth.OAuth2Client;
      } catch {
        throw new Error("Invalid service account JSON");
      }
    } else {
      throw new Error("No valid credentials provided");
    }

    this.oauth2Client.on("tokens", (tokens) => {
      this.credentials.accessToken = tokens.access_token ?? this.credentials.accessToken;
      this.credentials.refreshToken = tokens.refresh_token ?? this.credentials.refreshToken;
      if (tokens.expiry_date) {
        this.credentials.expiryDate = tokens.expiry_date;
      }
    });

    this.chatClient = google.chat({
      version: "v1",
      auth: this.oauth2Client,
    });
  }

  private async verifyConnection(): Promise<void> {
    if (!this.chatClient) {
      throw new Error("Chat client not initialized");
    }

    await this.chatClient.spaces.list({ pageSize: 1 });
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMessages();
      } catch {
        this.recordError();
      }
    }, DEFAULT_POLLING_INTERVAL);
  }

  private async pollMessages(): Promise<void> {
    if (!this.chatClient) return;

    const spaces = await this.listSpaces();

    for (const space of spaces) {
      const spaceName = space.name;
      if (!spaceName) continue;

      const spaceId = spaceName.replace("spaces/", "");
      
      try {
        const response = await this.chatClient.spaces.messages.list({
          parent: spaceName,
          pageSize: 10,
        });

        const messages = response.data.messages ?? [];
        
        for (const msg of messages) {
          const msgTime = msg.createTime 
            ? new Date(msg.createTime).getTime() 
            : 0;
          
          if (msgTime > this.lastMessageTime && msgTime <= Date.now()) {
            this.lastMessageTime = msgTime;
            
            const event: GoogleChatMessageEvent = {
              type: "MESSAGE",
              eventTime: msg.createTime ?? undefined,
              message: msg as GoogleChatMessageEvent["message"],
              space: space as GoogleChatMessageEvent["space"],
              thread: msg.thread as GoogleChatMessageEvent["thread"],
            };

            this.processMessage(msg, spaceId);
          }
        }
      } catch {
        this.recordError();
      }
    }
  }

  private processMessage(msg: chat_v1.Schema$Message, spaceId: string): void {
    const sender = msg.sender;
    const userId = sender?.name ?? "unknown";
    const content = msg.fallbackText ?? msg.argumentText ?? "";

    this.emitMessage({
      id: msg.name ?? this.generateId(),
      channelId: spaceId,
      channelType: "googlechat",
      userId,
      content,
      timestamp: msg.createTime ? new Date(msg.createTime).getTime() : Date.now(),
      metadata: {
        sender,
        thread: msg.thread,
        attachments: msg.attachment,
        cardsV2: msg.cardsV2,
      },
    });
  }

  private buildMessageBody(message: ChannelResponse): chat_v1.Schema$Message {
    const body: chat_v1.Schema$Message = {};

    if (message.content) {
      body.text = message.content;
    }

    if (message.attachments && message.attachments.length > 0) {
      body.attachment = message.attachments.map((attachment) => ({
        name: attachment.filename,
        contentName: attachment.filename,
        contentUrl: attachment.url,
        source: "HOSTED" as const,
      }));
    }

    return body;
  }

  private getSpaceId(context: ChannelContext): string | null {
    const spaceId = context.metadata?.spaceId ?? context.metadata?.channelId;
    return typeof spaceId === "string" ? spaceId : null;
  }

  private setConnectionState(state: GoogleChatConnectionState): void {
    this.connectionState = state;
    this.connected = state === "connected";
  }
}

export function createGoogleChatChannel(config: GoogleChatConfig): GoogleChatChannel {
  return new GoogleChatChannel(config);
}
