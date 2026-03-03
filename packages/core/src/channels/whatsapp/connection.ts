import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
  type ConnectionUpdate,
  type AuthStateResult,
} from "@whiskeysockets/baileys";
import { mkdir, access } from "node:fs/promises";

import { BaseChannel } from "../base.js";
import type { ChannelResponse, ChannelContext, ChannelType } from "../types.js";
import type {
  WhatsAppConfig,
  WhatsAppConnectionState,
  WhatsAppQRCode,
  WhatsAppMessage,
} from "./types.js";

const DEFAULT_QR_TIMEOUT = 60000;
const DEFAULT_RETRY_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Simple event emitter type
type EventListener = (...args: unknown[]) => void;

export class WhatsAppChannel extends BaseChannel {
  type: ChannelType = "whatsapp";
  private socket: WASocket | null = null;
  private authState: AuthStateResult | null = null;
  private connectionState: WhatsAppConnectionState = "disconnected";
  private qrCode: WhatsAppQRCode | null = null;
  private retryAttempts: number = 0;
  private maxRetryAttempts: number;
  private qrTimeout: number;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventListeners: Map<string, EventListener[]> = new Map();
  private currentJid: string | null = null;
  public config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    super({ type: "whatsapp", enabled: config.enabled ?? true });
    this.config = config;
    this.maxRetryAttempts = config.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.qrTimeout = config.qrCodeTimeout ?? DEFAULT_QR_TIMEOUT;
  }

  async connect(): Promise<void> {
    if (this.connectionState === "connected") {
      return;
    }

    this.setConnectionState("connecting");

    try {
      await this.ensureAuthDirectory();
      this.authState = await useMultiFileAuthState(this.config.authPath);

      this.socket = makeWASocket({
        auth: this.authState.state,
        printQRInTerminal: true,
        markOnlineOnConnect: this.config.markOnlineOnConnect ?? true,
        browser: ["SecuClaw", "Chrome", "120.0.0"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      this.setupEventHandlers();
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

    if (this.socket) {
      try {
        this.socket.end(undefined);
      } catch {
        // Ignore errors during disconnect
      }
      this.socket = null;
    }

    this.authState = null;
    this.currentJid = null;
    this.setConnectionState("disconnected");
    this.qrCode = null;
    this.retryAttempts = 0;
  }

  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    if (!this.socket || this.connectionState !== "connected") {
      throw new Error("WhatsApp not connected");
    }

    const recipient = context.metadata?.recipient as string | undefined;
    if (!recipient) {
      throw new Error("No recipient specified");
    }

    try {
      const jid = this.normalizeJid(recipient);

      if (message.attachments && message.attachments.length > 0) {
        // Handle attachments separately
        for (const attachment of message.attachments) {
          if (attachment.type === "link") {
            await this.socket!.sendMessage(jid, { text: `${message.content}\n${attachment.url}` });
          } else {
            await this.sendMediaMessage(jid, attachment as { type: "image" | "file"; url?: string; data?: Buffer; mimeType?: string }, message.content);
          }
        }
      } else {
        await this.socket.sendMessage(jid, {
          text: message.content,
        });
      }

      this.recordSend();
    } catch (error) {
      this.recordError();
      throw error;
    }
  }

  getConnectionState(): WhatsAppConnectionState {
    return this.connectionState;
  }

  getQRCode(): WhatsAppQRCode | null {
    return this.qrCode;
  }

  getCurrentJid(): string | null {
    return this.currentJid;
  }

  on(event: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(event) ?? [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(event) ?? [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    this.eventListeners.set(event, listeners);
  }

  async reconnect(): Promise<void> {
    if (this.connectionState === "reconnecting") {
      return;
    }

    this.setConnectionState("reconnecting");

    if (this.retryAttempts >= this.maxRetryAttempts) {
      this.setConnectionState("error");
      throw new Error("Max reconnection attempts reached");
    }

    this.retryAttempts++;
    await this.disconnect();

    // Wait before reconnecting
    await new Promise((resolve) => {
      this.reconnectTimeout = setTimeout(resolve, RECONNECT_DELAY);
    });

    await this.connect();
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event) ?? [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private async ensureAuthDirectory(): Promise<void> {
    try {
      await access(this.config.authPath);
    } catch {
      await mkdir(this.config.authPath, { recursive: true });
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("creds.update", this.handleCredsUpdate.bind(this));
    this.socket.ev.on("messages.upsert", this.handleMessagesUpsert.bind(this));
    this.socket.ev.on("typing", this.handleTyping.bind(this));
    this.socket.ev.on("read", this.handleRead.bind(this));
  }

  private async handleConnectionUpdate(update: Partial<ConnectionUpdate>): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.setConnectionState("waiting_for_qr");
      this.qrCode = {
        code: qr,
        expiresAt: Date.now() + this.qrTimeout,
      };
      this.emit("qr", this.qrCode);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message ?? "Unknown";

      if (statusCode === DisconnectReason.loggedOut) {
        this.setConnectionState("disconnected");
        this.emit("disconnected", { reason: "logged_out" });
      } else if (statusCode === DisconnectReason.connectionClosed) {
        this.setConnectionState("disconnected");
        this.emit("disconnected", { reason: "connection_closed" });
      } else {
        // Attempt reconnection
        if (this.retryAttempts < this.maxRetryAttempts) {
          await this.reconnect();
        } else {
          this.setConnectionState("error");
          this.emit("error", new Error(`Connection failed: ${reason}`));
        }
      }
    } else if (connection === "open") {
      this.setConnectionState("connected");
      this.retryAttempts = 0;
      this.qrCode = null;

      // Get our own JID
      if (this.socket?.user) {
        this.currentJid = this.socket.user.id;
      }

      this.emit("connected", undefined);
    }
  }

  private async handleCredsUpdate(): Promise<void> {
    if (this.authState?.saveCreds) {
      await this.authState.saveCreds();
    }
  }

  private handleMessagesUpsert(update: {
    messages: Array<{
      key: {
        id: string;
        remoteJid: string;
        fromMe: boolean;
        participant?: string;
      };
      message?: Record<string, unknown>;
      messageTimestamp?: number;
    }>;
    type: string;
  }): void {
    if (update.type !== "notify") return;

    for (const msg of update.messages) {
      // Skip messages from ourselves
      if (msg.key.fromMe) continue;

      const isGroup = msg.key.remoteJid?.endsWith("@g.us");
      const content = this.extractMessageContent(msg.message);
      const attachments = this.extractAttachments(msg.message);

      this.emitMessage({
        id: msg.key.id,
        channelId: msg.key.remoteJid ?? "unknown",
        channelType: "whatsapp",
        userId: msg.key.participant ?? msg.key.remoteJid ?? "unknown",
        content,
        timestamp: (msg.messageTimestamp ?? Date.now()) * 1000,
        metadata: {
          fromMe: msg.key.fromMe,
          participant: msg.key.participant,
          isGroup,
        },
        attachments,
      });
    }
  }

  private handleTyping(data: { jid: string; typist: string; isTyping: boolean }): void {
    this.emit("typing", {
      jid: data.jid,
      isTyping: data.isTyping,
    });
  }

  private handleRead(data: { jid: string; messageIds: string[] }): void {
    this.emit("read", data);
  }

  private extractMessageContent(message?: Record<string, unknown>): string {
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
    if (audioMessage) return "[Audio message]";

    const stickerMessage = message.stickerMessage;
    if (stickerMessage) return "[Sticker]";

    return "";
  }

  private extractAttachments(
    message?: Record<string, unknown>,
  ): Array<{ type: "image" | "file"; url?: string; data?: Buffer; mimeType?: string }> {
    const attachments: Array<{
      type: "image" | "file";
      url?: string;
      data?: Buffer;
      mimeType?: string;
    }> = [];

    if (!message) return attachments;

    const imageMessage = message.imageMessage as {
      url?: string;
      mimetype?: string;
      caption?: string;
      fileLength?: string;
    };
    if (imageMessage?.url) {
      attachments.push({
        type: "image",
        url: imageMessage.url,
        mimeType: imageMessage.mimetype,
      });
    }

    const documentMessage = message.documentMessage as {
      url?: string;
      mimetype?: string;
      fileName?: string;
    };
    if (documentMessage?.url) {
      attachments.push({
        type: "file",
        url: documentMessage.url,
        mimeType: documentMessage.mimetype,
      });
    }

    const videoMessage = message.videoMessage as {
      url?: string;
      mimetype?: string;
    };
    if (videoMessage?.url) {
      attachments.push({
        type: "file",
        url: videoMessage.url,
        mimeType: videoMessage.mimetype,
      });
    }

    const audioMessage = message.audioMessage as {
      url?: string;
      mimetype?: string;
    };
    if (audioMessage?.url) {
      attachments.push({
        type: "file",
        url: audioMessage.url,
        mimeType: audioMessage.mimetype,
      });
    }

    return attachments;
  }

  private async sendMediaMessage(
    jid: string,
    attachment: { type: "image" | "file"; url?: string; data?: Buffer; mimeType?: string },
    caption?: string,
  ): Promise<void> {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }

    const messageOptions: Record<string, unknown> = {
      caption,
    };

    if (attachment.url) {
      if (attachment.type === "image") {
        messageOptions.image = { url: attachment.url };
      } else {
        messageOptions.document = { url: attachment.url };
      }
    } else if (attachment.data) {
      if (attachment.type === "image") {
        messageOptions.image = attachment.data;
      } else {
        messageOptions.document = attachment.data;
      }
    }

    await this.socket.sendMessage(jid, messageOptions);
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

  private setConnectionState(state: WhatsAppConnectionState): void {
    this.connectionState = state;
    this.connected = state === "connected";
  }
}

export function createWhatsAppChannel(config: WhatsAppConfig): WhatsAppChannel {
  return new WhatsAppChannel(config);
}
