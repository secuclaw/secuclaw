export type ChannelType =
  | "telegram"
  | "discord"
  | "slack"
  | "web"
  | "cli"
  | "feishu"
  | "googlechat"
  | "imessage"
  | "signal"
  | "whatsapp"
  | "teams";

export enum ChannelStatus {
  CREATED = "created",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  READY = "ready",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

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

export interface UnifiedParty {
  id: string;
  name?: string;
  type?: "user" | "bot" | "group" | "channel";
}

export interface UnifiedMessage {
  id: string;
  channelId: string;
  channelType: ChannelType;
  from: UnifiedParty;
  to?: UnifiedParty;
  content: string;
  attachments?: ChannelAttachment[];
  timestamp: number;
  metadata?: Record<string, unknown>;
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
  channelId?: string;
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
  monitorIntervalMs?: number;
}

export interface ChannelStats {
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  lastActivity: number;
}

export interface ChannelMetrics extends ChannelStats {
  uptimeMs: number;
  healthCheckSuccesses: number;
  healthCheckFailures: number;
  lastErrorAt?: number;
}

export interface HealthResult {
  ok: boolean;
  status: ChannelStatus;
  checkedAt: number;
  latencyMs: number;
  details?: Record<string, unknown>;
  error?: string;
}
