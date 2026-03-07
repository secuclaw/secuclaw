export type ChannelType = "telegram" | "discord" | "slack" | "web" | "cli" | "feishu";

export interface ChannelMessage {
  id: string;
  channelId: string;
  channelType: ChannelType;
  userId: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  replyTo?: string;
  attachments?: ChannelAttachment[];
}

export interface ChannelAttachment {
  type: "image" | "file" | "link";
  url?: string;
  data?: Buffer;
  filename?: string;
  mimeType?: string;
}

export interface ChannelResponse {
  content: string;
  attachments?: ChannelAttachment[];
  replyTo?: string;
  ephemeral?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  token?: string;
  webhookUrl?: string;
  botId?: string;
  guildId?: string;
  defaultTimeout?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface Channel {
  type: ChannelType;
  config: ChannelConfig;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  send(message: ChannelResponse, context: ChannelContext): Promise<void>;
  onMessage(callback: (message: ChannelMessage) => void): void;
}

export interface ChannelContext {
  channelId: string;
  userId: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelManagerOptions {
  channels: ChannelConfig[];
  defaultChannel?: ChannelType;
  messageQueueSize?: number;
}

export interface ChannelStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  lastActivity: number;
}
