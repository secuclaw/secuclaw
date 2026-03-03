import type { WASocket } from "@whiskeysockets/baileys";

import type { ChannelType } from "../types.js";
import type {
  WhatsAppMessage,
  WhatsAppSendResult,
  WhatsAppMessageOptions,
  WhatsAppReactionOptions,
} from "./types.js";

export class WhatsAppMessageHandler {
  private socket: WASocket | null = null;

  setSocket(socket: WASocket | null): void {
    this.socket = socket;
  }

  async sendText(
    recipient: string,
    text: string,
    _options?: WhatsAppMessageOptions,
  ): Promise<WhatsAppSendResult> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);
    const result = await this.socket!.sendMessage(jid, {
      text,
    });

    return {
      id: result.key.id ?? "",
      timestamp: typeof result.messageTimestamp === 'number' ? result.messageTimestamp : Date.now(),
      recipient: jid,
    };
  }

  async sendReply(
    recipient: string,
    text: string,
    quotedMessageId: string,
  ): Promise<WhatsAppSendResult> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);
    const result = await this.socket!.sendMessage(
      jid,
      {
        text,
      },
      {
        quoted: {
          key: {
            id: quotedMessageId,
          },
        },
      },
    );

    return {
      id: result.key.id ?? "",
      timestamp: typeof result.messageTimestamp === 'number' ? result.messageTimestamp : Date.now(),
      recipient: jid,
    };
  }

  async react(
    recipient: string,
    options: WhatsAppReactionOptions,
  ): Promise<void> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);
    await this.socket!.sendMessage(
      jid,
      {
        reaction: {
          key: {
            id: options.messageId,
            remoteJid: jid,
          },
          text: options.emoji,
        },
      },
    );
  }

  async markAsRead(chatJid: string, messageIds: string[]): Promise<void> {
    this.ensureSocket();

    await this.socket!.readMessages([
      ...messageIds.map((id) => ({
        remoteJid: chatJid,
        id,
      })),
    ]);
  }

  async deleteMessage(chatJid: string, messageId: string): Promise<void> {
    this.ensureSocket();

    await this.socket!.sendMessage(chatJid, {
      delete: {
        remoteJid: chatJid,
        id: messageId,
        fromMe: true,
      },
    });
  }

  async getMessage(chatJid: string, messageId: string): Promise<WhatsAppMessage | null> {
    this.ensureSocket();

    const result = await this.socket!.fetchMessagesFromWA(chatJid, 1);

    if (!result || result.length === 0) {
      return null;
    }

    const msg = result[0];
    return this.parseMessage({
      key: {
        id: msg.key.id ?? "",
        remoteJid: msg.key.remoteJid ?? "",
        fromMe: msg.key.fromMe ?? false,
        participant: msg.key.participant ?? undefined,
      },
      message: msg.message as Record<string, unknown> | undefined,
      messageTimestamp: typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : Date.now(),
    }, chatJid);
  }

  async getChatMessages(
    chatJid: string,
    limit: number = 50,
    cursor?: { before?: string },
  ): Promise<WhatsAppMessage[]> {
    this.ensureSocket();

    const result = await this.socket!.loadMessageFromWA(chatJid, cursor?.before ?? "");

    if (!result) {
      return [];
    }

    return [this.parseMessage({
      key: {
        id: result.key.id ?? "",
        remoteJid: result.key.remoteJid ?? "",
        fromMe: result.key.fromMe ?? false,
        participant: result.key.participant ?? undefined,
      },
      message: result.message as Record<string, unknown> | undefined,
      messageTimestamp: typeof result.messageTimestamp === 'number' ? result.messageTimestamp : Date.now(),
    }, chatJid)];
  }

  async sendTypingIndicator(chatJid: string): Promise<void> {
    this.ensureSocket();

    await this.socket!.sendPresenceUpdate("composing", chatJid);
  }

  async sendRecordingIndicator(chatJid: string): Promise<void> {
    this.ensureSocket();

    await this.socket!.sendPresenceUpdate("recording", chatJid);
  }

  async sendPausedIndicator(chatJid: string): Promise<void> {
    this.ensureSocket();

    await this.socket!.sendPresenceUpdate("paused", chatJid);
  }

  parseMessage(
    msg: {
      key: {
        id: string;
        remoteJid: string;
        fromMe: boolean;
        participant?: string;
      };
      message?: Record<string, unknown>;
      messageTimestamp?: number;
    },
    chatJid: string,
  ): WhatsAppMessage {
    const isGroup = chatJid.endsWith("@g.us");
    const content = this.extractContent(msg.message);

    return {
      id: msg.key.id ?? "",
      channelId: chatJid,
      channelType: "whatsapp" as ChannelType,
      userId: msg.key.participant ?? msg.key.remoteJid ?? "unknown",
      content,
      timestamp: (msg.messageTimestamp ?? Date.now()) * 1000,
      isGroup,
      groupId: isGroup ? chatJid : undefined,
      participant: msg.key.participant,
      isSelf: msg.key.fromMe,
      metadata: {
        fromMe: msg.key.fromMe,
      },
      type: "text",
    };
  }

  private extractContent(message?: Record<string, unknown>): string {
    if (!message) return "";

    const conversation = (message.conversation as string) ?? "";
    if (conversation) return conversation;

    const extendedText = message.extendedTextMessage as { text?: string };
    if (extendedText?.text) return extendedText.text;

    const imageMessage = message.imageMessage as { caption?: string };
    if (imageMessage?.caption) return imageMessage.caption;

    const documentMessage = message.documentMessage as { caption?: string };
    if (documentMessage?.caption) return documentMessage.caption;

    const videoMessage = message.videoMessage as { caption?: string };
    if (videoMessage?.caption) return videoMessage.caption;

    const audioMessage = message.audioMessage;
    if (audioMessage) return "[Audio]";

    const stickerMessage = message.stickerMessage;
    if (stickerMessage) return "[Sticker]";

    const locationMessage = message.locationMessage;
    if (locationMessage) return "[Location]";

    const contactMessage = message.contactMessage;
    if (contactMessage) return "[Contact]";

    return "";
  }

  private normalizeJid(number: string): string {
    if (number.endsWith("@g.us") || number.endsWith("@s.whatsapp.net")) {
      return number;
    }

    if (number.includes("@")) {
      return number;
    }

    const cleanNumber = number.replace(/\D/g, "");
    return `${cleanNumber}@s.whatsapp.net`;
  }

  private ensureSocket(): void {
    if (!this.socket) {
      throw new Error("Socket not initialized. Call setSocket first.");
    }
  }
}

export function createMessageHandler(): WhatsAppMessageHandler {
  return new WhatsAppMessageHandler();
}
