import type { ChannelConfig } from "../types.js";

export type IMessageChannelType = "imessage";

/**
 * Configuration for iMessage channel via BlueBubbles
 */
export interface IMessageConfig extends ChannelConfig {
  type: "imessage";
  /** BlueBubbles server URL (e.g., https://your-server.ngrok.io) */
  serverUrl: string;
  /** BlueBubbles server password/API token */
  password: string;
  /** Default chat GUID to send messages to */
  defaultChatGuid?: string;
  /** Enable private API (better functionality) */
  usePrivateApi?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * BlueBubbles API response wrapper
 */
export interface BlueBubblesResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
  error?: {
    type: string;
    error: string;
  };
}

/**
 * Chat/Conversation from BlueBubbles
 */
export interface BlueBubblesChat {
  guid: string;
  displayName: string;
  participants: BlueBubblesParticipant[];
  lastMessage?: BlueBubblesMessage;
  unreadCount: number;
  isGroup: boolean;
  /** Original properties from API */
  original?: Record<string, unknown>;
}

/**
 * Chat participant
 */
export interface BlueBubblesParticipant {
  address: string;
  displayName?: string;
  /** Whether this is the current user */
  isMe: boolean;
}

/**
 * Message from BlueBubbles
 */
export interface BlueBubblesMessage {
  guid: string;
  text?: string;
  subject?: string;
  chatGuid: string;
  handle?: BlueBubblesHandle;
  isFromMe: boolean;
  isRead: boolean;
  dateCreated: number;
  dateDelivered?: number;
  dateRead?: number;
  attachments?: BlueBubblesAttachment[];
  /** Message type (e.g., 'text', 'sticker', 'tapback') */
  type?: string;
}

/**
 * Handle (sender/recipient) information
 */
export interface BlueBubblesHandle {
  address: string;
  displayName?: string;
  id?: number;
}

/**
 * Attachment in a message
 */
export interface BlueBubblesAttachment {
  guid: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  /** URL to download the attachment */
  downloadUrl?: string;
  /** Original path on the server */
  originalPath?: string;
  /** Transfer state (0=pending, 1=complete, 2=error) */
  transferState?: number;
}

/**
 * iMessage-specific message for channel
 */
export interface IMessageMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: number;
  isFromMe: boolean;
  chatGuid: string;
  metadata?: {
    subject?: string;
    attachments?: BlueBubblesAttachment[];
    handle?: BlueBubblesHandle;
  };
}

/**
 * Attachment handling options
 */
export interface IMessageAttachmentOptions {
  /** File path or URL */
  source?: string;
  /** Buffer data */
  data?: Buffer;
  /** MIME type (auto-detected if not provided) */
  mimeType?: string;
  /** Alternative file name */
  filename?: string;
}

/**
 * Send message options
 */
export interface IMessageSendOptions {
  /** Chat GUID (required unless defaultChatGuid is configured) */
  chatGuid?: string;
  /** Message text */
  text: string;
  /** Message subject (iMessage only) */
  subject?: string;
  /** Attachments to send */
  attachments?: IMessageAttachmentOptions[];
  /** Reply to message GUID */
  replyGuid?: string;
  /** Effect (e.g., 'screen', 'balloon') */
  effect?: string;
}

/**
 * Webhook payload from BlueBubbles
 */
export interface BlueBubblesWebhookPayload {
  event: "new-message" | "message-updated" | "chat-read-status" | "typing";
  data: BlueBubblesMessage | BlueBubblesChat;
  timestamp: number;
}

/**
 * iMessage channel connection state
 */
export type IMessageConnectionState = "disconnected" | "connecting" | "connected" | "error";
