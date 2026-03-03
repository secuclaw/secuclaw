import type { Attachment } from "./attachment.js";

export interface IncomingMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  timestamp: number;
  replyToMessageId?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  text: string;
  chatId: string;
  replyToMessageId?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

export interface MessageResult {
  messageId: string;
  chatId: string;
  sentAt: number;
}

export interface ChatInfo {
  chatId: string;
  title?: string;
  type?: "private" | "group" | "channel";
}

export interface MemberInfo {
  chatId: string;
  userId: string;
  displayName?: string;
  role?: string;
}

export class MessageBuilder {
  private message: OutgoingMessage;

  constructor(chatId: string, text: string = "") {
    this.message = {
      chatId,
      text,
    };
  }

  withText(text: string): this {
    this.message.text = text;
    return this;
  }

  withReplyTo(messageId: string): this {
    this.message.replyToMessageId = messageId;
    return this;
  }

  withAttachments(attachments: Attachment[]): this {
    this.message.attachments = attachments;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.message.metadata = metadata;
    return this;
  }

  build(): OutgoingMessage {
    return { ...this.message };
  }
}
