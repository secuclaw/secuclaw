import type { ChannelContext } from "./types.js";
import type { IncomingMessage, OutgoingMessage, MessageResult, ChatInfo, MemberInfo } from "./message.js";

export interface IChannelCapabilities {
  readonly text: boolean;
  readonly markdown: boolean;
  readonly attachments: boolean;
  readonly buttons: boolean;
  readonly carousel: boolean;
  readonly typing: boolean;
  readonly reply: boolean;
  readonly edit: boolean;
  readonly delete: boolean;
  readonly maxAttachmentSize: number;
  readonly supportedFormats: string[];
}

export interface ChannelError {
  code: string;
  message: string;
  cause?: unknown;
}

export type MessageHandler = (message: IncomingMessage) => Promise<void> | void;
export type ErrorHandler = (error: ChannelError) => void;

export interface IMessageChannel {
  readonly id: string;
  readonly name: string;
  readonly capabilities: IChannelCapabilities;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  send(message: OutgoingMessage, context?: ChannelContext): Promise<MessageResult>;
  sendTyping(chatId: string): Promise<void>;

  onMessage(handler: MessageHandler): void;
  onError(handler: ErrorHandler): void;

  edit(chatId: string, messageId: string, text: string): Promise<void>;
  delete(chatId: string, messageId: string): Promise<void>;

  getChatInfo(chatId: string): Promise<ChatInfo>;
  getMemberInfo(chatId: string, userId: string): Promise<MemberInfo>;
}
