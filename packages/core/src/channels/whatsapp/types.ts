import type { ChannelMessage, ChannelAttachment as BaseChannelAttachment, ChannelConfig } from "../types.js";
import type { ChannelType } from "../types.js";

export type WhatsAppChannelType = "whatsapp";

export interface WhatsAppConfig extends ChannelConfig {
  type: WhatsAppChannelType;
  authPath: string;
  sessionId?: string;
  markOnlineOnConnect?: boolean;
  qrCodeTimeout?: number;
  retryAttempts?: number;
}

export type WhatsAppMessageType = "text" | "image" | "document" | "audio" | "video" | "sticker" | "reaction";

export interface WhatsAppMessage extends Omit<ChannelMessage, "attachments"> {
  type: WhatsAppMessageType;
  timestamp: number;
  isGroup: boolean;
  groupId?: string;
  participant?: string;
  isSelf: boolean;
  isReply?: boolean;
  replyToId?: string;
  attachments?: WhatsAppAttachment[];
  reaction?: string;
  reactionSender?: string;
}

export interface WhatsAppAttachment extends BaseChannelAttachment {
  mimeType: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  thumbnail?: string;
}

export interface WhatsAppContact {
  id: string;
  name?: string;
  number: string;
  isGroup: boolean;
  isMe?: boolean;
  isWorker?: boolean;
}

export interface WhatsAppGroupInfo {
  id: string;
  subject: string;
  description?: string;
  owner: string;
  participants: string[];
}

export type WhatsAppConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authenticating"
  | "waiting_for_qr"
  | "error"
  | "reconnecting";

export interface WhatsAppQRCode {
  code: string;
  expiresAt: number;
}

export interface WhatsAppMessageOptions {
  quotedMessageId?: string;
  mentionedJids?: string[];
  caption?: string;
  linkPreview?: boolean;
  sendAudioAsVoice?: boolean;
}

export interface WhatsAppSendResult {
  id: string;
  timestamp: number;
  recipient: string;
}

export interface WhatsAppReactionOptions {
  emoji: string;
  messageId: string;
  chatJid: string;
}

export interface WhatsAppEventMap {
  message: WhatsAppMessage;
  qr: WhatsAppQRCode;
  connected: void;
  disconnected: { reason?: string };
  error: Error;
  typing: { jid: string; isTyping: boolean };
  read: { jid: string; messageIds: string[] };
}
