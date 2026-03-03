import { EventEmitter } from "node:events";

import { BaseChannel } from "../base.js";
import type { ChannelResponse, ChannelContext } from "../types.js";
import type {
  TeamsConfig,
  TeamsConnectionState,
  TeamsEventMap,
  TeamsCredentials,
  TeamsActivity,
  TeamsAdaptiveCard,
  TeamsSendResult,
  TeamsMessageOptions,
  TeamsUser,
  TeamsConversation,
  TeamsAttachment,
} from "./types.js";

const DEFAULT_SCOPES = [
  "https://graph.microsoft.com/.default",
  "https://api.botframework.com/.default",
];

const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes before expiry

export class TeamsChannel extends BaseChannel {
  type = "teams" as const;
  private credentials: TeamsCredentials;
  private connectionState: TeamsConnectionState = "disconnected";
  private eventEmitter: EventEmitter;
  private accessToken: string | null = null;
  private scopes: string[];
  private tenantId: string | undefined;
  private serviceUrl: string | undefined;
  private oauthEndpoint: string;
  private appId: string;
  private appPassword: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = 0;

  constructor(config: TeamsConfig) {
    super(config);
    this.appId = config.appId;
    this.appPassword = config.appPassword;
    this.credentials = {};
    this.scopes = config.scopes ?? DEFAULT_SCOPES;
    this.tenantId = config.tenantId;
    this.serviceUrl = config.serviceUrl;
    this.oauthEndpoint =
      config.oauthEndpoint ?? "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token";
    this.eventEmitter = new EventEmitter();
  }

  async connect(): Promise<void> {
    if (this.connectionState === "connected") {
      return;
    }

    this.setConnectionState("connecting");

    try {
      await this.authenticate();
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
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.accessToken = null;
    this.setConnectionState("disconnected");
    this.reconnectAttempts = 0;
    this.eventEmitter.emit("disconnected", { reason: "manual_disconnect" });
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    if (this.connectionState !== "connected") {
      throw new Error("Teams not connected");
    }

    const conversationId = this.getConversationId(context);
    if (!conversationId) {
      throw new Error("No conversation ID specified");
    }

    try {
      await this.sendMessageToConversation(conversationId, {
        text: message.content,
        card: message.metadata?.adaptiveCard as TeamsAdaptiveCard | undefined,
        attachments: message.attachments?.map((att) => this.convertAttachment(att)),
      });
      this.recordSend();
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  async sendMessageToConversation(
    conversationId: string,
    options: TeamsMessageOptions,
  ): Promise<TeamsSendResult> {

    const payload = this.buildMessagePayload(options);

    const response = await fetch(
      `${this.serviceUrl ?? "https://smba.trafficmanager.net/teams/v3.0"}/conversations/${conversationId}/activities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to send message: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.recordSend();

    return {
      id: data.id,
      conversationId,
      recipientId: "",
      timestamp: new Date().toISOString(),
    };
  }

  async createConversation(
    members: TeamsUser[],
    channelData?: { team?: { id: string }; channel?: { id: string } },
  ): Promise<TeamsConversation> {
    await this.ensureValidToken();

    const endpoint = this.serviceUrl ?? "https://smba.trafficmanager.net/teams/v3.0";

    const response = await fetch(`${endpoint}/conversations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isGroup: true,
        members,
        channelData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to create conversation: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    return response.json() as Promise<TeamsConversation>;
  }

  async getConversation(conversationId: string): Promise<TeamsConversation | null> {
    await this.ensureValidToken();

    const endpoint = this.serviceUrl ?? "https://smba.trafficmanager.net/teams/v3.0";

    const response = await fetch(`${endpoint}/conversations/${conversationId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get conversation: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    return response.json() as Promise<TeamsConversation>;
  }

  async getTeamMembers(teamId: string): Promise<TeamsUser[]> {
    await this.ensureValidToken();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/members`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get team members: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      value: Array<{ id: string; displayName: string; email: string }>;
    };

    return data.value.map((member) => ({
      id: member.id,
      name: member.displayName,
      email: member.email,
    }));
  }

  getConnectionState(): TeamsConnectionState {
    return this.connectionState;
  }

  on<T extends keyof TeamsEventMap>(
    event: T,
    listener: (data: TeamsEventMap[T]) => void,
  ): void {
    this.eventEmitter.on(event, listener as (...args: unknown[]) => void);
  }

  off<T extends keyof TeamsEventMap>(
    event: T,
    listener: (data: TeamsEventMap[T]) => void,
  ): void {
    this.eventEmitter.off(event, listener as (...args: unknown[]) => void);
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

    await this.connect();
  }

  processWebhookEvent(activity: TeamsActivity): void {
    if (activity.type === "message" && activity.conversation) {
      this.emitMessage({
        id: activity.id,
        channelId: activity.conversation.id,
        channelType: "teams",
        userId: activity.from.aadObjectId ?? activity.from.id,
        content: activity.text ?? "",
        timestamp: new Date(activity.timestamp).getTime(),
        metadata: {
          activity,
          conversation: activity.conversation,
          channelData: activity.channelData,
          attachments: activity.attachments,
        },
      });
    }

    this.eventEmitter.emit("message", activity);
  }

  private async authenticate(): Promise<void> {
    this.setConnectionState("authenticating");

    const tokenUrl = this.oauthEndpoint;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.appId,
      client_secret: this.appPassword,
      scope: this.scopes.join(" "),
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Authentication failed: ${(error as { error?: { description?: string } })?.error?.description ?? response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
    };

    this.accessToken = data.access_token;
    this.credentials.accessToken = data.access_token;
    this.credentials.expiresAt = Date.now() + data.expires_in * 1000;
  }

  private async ensureValidToken(): Promise<void> {
    if (
      !this.accessToken ||
      !this.credentials.expiresAt ||
      Date.now() > this.credentials.expiresAt - TOKEN_REFRESH_BUFFER
    ) {
      await this.authenticate();
    }
  }

  private startPolling(): void {
    if (!this.serviceUrl) return;

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollConversations();
      } catch {
        this.recordError();
      }
    }, 5000);
  }

  private async pollConversations(): Promise<void> {
    if (!this.accessToken) return;

    const endpoint = this.serviceUrl ?? "https://smba.trafficmanager.net/teams/v3.0";

    try {
      const response = await fetch(`${endpoint}/conversations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return;

      const data = (await response.json()) as { conversations?: TeamsConversation[] };
      const conversations = data.conversations ?? [];

      for (const conversation of conversations) {
        await this.pollMessages(conversation.id);
      }
    } catch {
      // Silently handle polling errors
    }
  }

  private async pollMessages(conversationId: string): Promise<void> {
    if (!this.accessToken) return;

    const endpoint = this.serviceUrl ?? "https://smba.trafficmanager.net/teams/v3.0";

    try {
      const response = await fetch(
        `${endpoint}/conversations/${conversationId}/activities?top=10`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) return;

      const data = (await response.json()) as { activities?: TeamsActivity[] };
      const activities = data.activities ?? [];

      for (const activity of activities) {
        const activityTime = new Date(activity.timestamp).getTime();
        if (activityTime > this.lastActivityTime && activity.type === "message") {
          this.lastActivityTime = activityTime;
          this.processWebhookEvent(activity);
        }
      }
    } catch {
      // Silently handle polling errors
    }
  }

  private buildMessagePayload(options: TeamsMessageOptions): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      type: "message",
    };

    if (options.text) {
      payload.text = options.text;
    }

    if (options.card) {
      payload.attachments = [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: options.card,
        },
      ];
    } else if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments;
    }

    if (options.replyToId) {
      payload.replyToId = options.replyToId;
    }

    if (options.mentions && options.mentions.length > 0) {
      payload.entities = options.mentions.map((mention) => ({
        type: "mention",
        text: mention.text,
        mentioned: mention.mentioned,
      }));
    }

    return payload;
  }

  private convertAttachment(
    attachment: { type: string; url?: string; filename?: string; mimeType?: string },
  ): TeamsAttachment {
    return {
      contentType: attachment.mimeType ?? "application/octet-stream",
      contentUrl: attachment.url,
      name: attachment.filename,
    };
  }

  private getConversationId(context: ChannelContext): string | null {
    const conversationId =
      context.metadata?.conversationId ?? context.metadata?.channelId ?? context.channelId;
    return typeof conversationId === "string" ? conversationId : null;
  }

  private setConnectionState(state: TeamsConnectionState): void {
    this.connectionState = state;
    this.connected = state === "connected";
  }
}

export function createTeamsChannel(config: TeamsConfig): TeamsChannel {
  return new TeamsChannel(config);
}
