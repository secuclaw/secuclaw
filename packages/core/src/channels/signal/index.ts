import { BaseChannel } from "../base.js";
import type {
  ChannelConfig,
  ChannelMessage,
  ChannelResponse,
  ChannelContext,
  ChannelAttachment,
} from "../types.js";
import type { SignalConfig, SignalReceivedMessage } from "./types.js";
import { SignalConnection, createSignalConnection } from "./connection.js";
import { SignalMessageHandler, createSignalMessageHandler } from "./message.js";
import { SignalAttachmentHandler, createSignalAttachmentHandler } from "./attachment.js";

/**
 * Signal channel implementation
 */
export class SignalChannel extends BaseChannel {
  type = "signal" as const;
  private connection: SignalConnection;
  private messageHandler: SignalMessageHandler;
  private attachmentHandler: SignalAttachmentHandler;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private receiveTimeout: number;
  private maxAttachmentSize: number;

  constructor(config: SignalConfig) {
    super(config);
    this.connection = createSignalConnection(config);
    this.messageHandler = createSignalMessageHandler(this.connection);
    this.attachmentHandler = createSignalAttachmentHandler(
      this.connection,
      config.signalCliPath ? undefined : undefined,
      config.maxAttachmentSize
    );
    this.receiveTimeout = config.receiveTimeout ?? 30000;
    this.maxAttachmentSize = config.maxAttachmentSize ?? 100 * 1024 * 1024;

    // Forward incoming messages to the channel
    this.messageHandler.onMessage((signalMessage) => {
      this.handleIncomingMessage(signalMessage);
    });
  }

  /**
   * Connect to Signal
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error("Signal channel is not enabled");
    }

    await this.connection.connect();
    this.connected = true;

    // Start listening for messages
    this.startPolling();
  }

  /**
   * Disconnect from Signal
   */
  async disconnect(): Promise<void> {
    this.stopPolling();
    await this.connection.disconnect();
    this.connected = false;
  }

  /**
   * Send a message through Signal
   */
  async send(message: ChannelResponse, context: ChannelContext): Promise<void> {
    const recipient = this.resolveRecipient(context);

    const outgoingMessage = {
      recipient,
      body: message.content,
      attachments: this.convertAttachments(message.attachments),
    };

    const success = await this.messageHandler.send(outgoingMessage);

    if (!success) {
      this.recordError();
      throw new Error("Failed to send Signal message");
    }

    this.recordSend();

    // Handle additional attachments if present
    if (message.attachments && message.attachments.length > 1) {
      for (let i = 1; i < message.attachments.length; i++) {
        const attachment = message.attachments[i];
        const attachmentPath = await this.prepareAttachment(attachment);
        if (attachmentPath) {
          await this.messageHandler.send({
            recipient,
            body: "",
            attachments: [
              {
                id: `att_${i}`,
                contentType: attachment.mimeType || "application/octet-stream",
                filename: attachment.filename,
                path: attachmentPath,
              },
            ],
          });
        }
      }
    }
  }

  /**
   * Resolve the recipient from context
   */
  private resolveRecipient(context: ChannelContext): string {
    const recipient = context.metadata?.recipient;
    if (typeof recipient === "string" && recipient.length > 0) {
      return recipient;
    }

    // Fall back to channelId
    return context.channelId;
  }

  /**
   * Convert channel attachments to Signal attachments
   */
  private convertAttachments(attachments?: ChannelAttachment[]): Array<{
    id: string;
    contentType: string;
    filename?: string;
    path?: string;
  }> {
    if (!attachments) {
      return [];
    }

    return attachments.map((att) => ({
      id: att.filename || `att_${Date.now()}`,
      contentType: att.mimeType || "application/octet-stream",
      filename: att.filename,
      path: typeof att.data === "string" ? att.data : undefined,
    }));
  }

  /**
   * Prepare an attachment for sending
   */
  private async prepareAttachment(attachment: ChannelAttachment): Promise<string | null> {
    if (attachment.url) {
      return this.attachmentHandler.downloadFromUrl(attachment.url, attachment.filename);
    }

    if (attachment.data) {
      // Handle Buffer data
      return null; // Would need to write to temp file
    }

    return null;
  }

  /**
   * Start polling for messages
   */
  private startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    // Poll every 5 seconds by default
    this.pollingInterval = setInterval(async () => {
      try {
        await this.messageHandler.pollMessages();
      } catch (error) {
        console.error("Signal polling error:", error);
        this.recordError();
      }
    }, 5000);

    // Also fetch pending messages immediately
    this.messageHandler.pollMessages().catch((error) => {
      console.error("Error fetching initial Signal messages:", error);
    });
  }

  /**
   * Stop polling for messages
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.messageHandler.stopListening();
  }

  /**
   * Handle incoming Signal message
   */
  private handleIncomingMessage(signalMessage: SignalReceivedMessage): void {
    const attachments: ChannelAttachment[] = [];

    if (signalMessage.attachments) {
      for (const att of signalMessage.attachments) {
        attachments.push({
          type: this.getAttachmentType(att.contentType),
          url: att.path,
          mimeType: att.contentType,
          filename: att.filename,
        });
      }
    }

    const message: ChannelMessage = {
      id: signalMessage.id,
      channelId: signalMessage.groupInfo?.id || signalMessage.sender,
      channelType: "signal",
      userId: signalMessage.sender,
      content: signalMessage.body,
      timestamp: signalMessage.timestamp,
      metadata: {
        groupInfo: signalMessage.groupInfo,
        reactions: signalMessage.reactions,
      },
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    this.emitMessage(message);
  }

  /**
   * Determine attachment type from MIME type
   */
  private getAttachmentType(mimeType: string): "image" | "file" | "link" {
    if (mimeType.startsWith("image/")) {
      return "image";
    }
    if (mimeType.startsWith("text/") || mimeType.startsWith("application/")) {
      return "file";
    }
    return "file";
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(recipient: string, emoji: string, messageId: string): Promise<boolean> {
    return this.messageHandler.sendReaction(recipient, emoji, messageId);
  }

  /**
   * Delete a message
   */
  async deleteMessage(recipient: string, messageId: string): Promise<boolean> {
    return this.messageHandler.deleteMessage(recipient, messageId);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return this.connection.connectionStatus;
  }

  /**
   * Get account info
   */
  async getAccountInfo() {
    return this.connection.getAccountInfo();
  }

  /**
   * List groups
   */
  async listGroups() {
    const result = await this.connection.listGroups();
    if (result.success && result.output) {
      try {
        return JSON.parse(result.output);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Create a new group
   */
  async createGroup(name: string, members: string[]) {
    return this.connection.createGroup(name, members);
  }

  /**
   * Update profile
   */
  async updateProfile(updates: { name?: string; avatar?: string }) {
    return this.connection.updateProfile(updates);
  }
}

/**
 * Create a Signal channel instance
 */
export function createSignalChannel(config: SignalConfig): SignalChannel {
  return new SignalChannel(config);
}

// Re-export types
export type { SignalConfig, SignalReceivedMessage } from "./types.js";
export type { SignalAttachment, SignalGroupInfo, SignalReaction } from "./types.js";
