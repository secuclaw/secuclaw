import type {
  SignalReceivedMessage,
  SignalOutgoingMessage,
  SignalAttachment,
  SignalGroupInfo,
  SignalReaction,
} from "./types.js";
import { SignalConnection } from "./connection.js";

/**
 * Message handler for Signal channel
 */
export class SignalMessageHandler {
  private connection: SignalConnection;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private messageCallbacks: Array<(message: SignalReceivedMessage) => void> = [];
  private isListening = false;

  constructor(connection: SignalConnection) {
    this.connection = connection;
  }

  /**
   * Register a callback for incoming messages
   */
  onMessage(callback: (message: SignalReceivedMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Remove a message callback
   */
  offMessage(callback: (message: SignalReceivedMessage) => void): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  /**
   * Start polling for messages
   */
  startListening(intervalMs = 5000): void {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMessages();
      } catch (error) {
        console.error("Error polling Signal messages:", error);
      }
    }, intervalMs);

    // Also fetch any pending messages immediately
    this.pollMessages().catch((error) => {
      console.error("Error fetching initial Signal messages:", error);
    });
  }

  /**
   * Stop polling for messages
   */
  stopListening(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.isListening = false;
  }

  /**
   * Poll for new messages
   */
  async pollMessages(): Promise<SignalReceivedMessage[]> {
    const output = await this.connection.receiveMessages(50);
    const messages = this.parseMessages(output);

    for (const message of messages) {
      this.emitMessage(message);
    }

    return messages;
  }

  /**
   * Parse raw CLI output into message objects
   */
  parseMessages(rawOutput: string): SignalReceivedMessage[] {
    if (!rawOutput || rawOutput.trim() === "") {
      return [];
    }

    try {
      const data = JSON.parse(rawOutput);
      const messages: SignalReceivedMessage[] = [];

      // Handle both array and single object
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item.envelope) {
          const envelope = item.envelope;
          const message: SignalReceivedMessage = {
            id: envelope.id || String(Date.now()),
            sender: this.normalizePhoneNumber(envelope.sourceNumber || envelope.source),
            timestamp: envelope.timestamp ? Number(envelope.timestamp) : Date.now(),
            body: this.extractMessageBody(envelope),
            attachments: this.extractAttachments(envelope),
            groupInfo: this.extractGroupInfo(envelope),
            reactions: this.extractReactions(envelope),
          };
          messages.push(message);
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * Extract message body from envelope
   */
  private extractMessageBody(envelope: Record<string, unknown>): string {
    if (typeof envelope.dataMessage === "object" && envelope.dataMessage !== null) {
      const dataMessage = envelope.dataMessage as Record<string, unknown>;
      return String(dataMessage.body || "");
    }
    if (typeof envelope.syncMessage === "object" && envelope.syncMessage !== null) {
      const syncMessage = envelope.syncMessage as Record<string, unknown>;
      if (typeof syncMessage.sentMessage === "object" && syncMessage.sentMessage !== null) {
        return String((syncMessage.sentMessage as Record<string, unknown>).body || "");
      }
    }
    return "";
  }

  /**
   * Extract attachments from envelope
   */
  private extractAttachments(envelope: Record<string, unknown>): SignalAttachment[] {
    const attachments: SignalAttachment[] = [];

    if (typeof envelope.dataMessage === "object" && envelope.dataMessage !== null) {
      const dataMessage = envelope.dataMessage as Record<string, unknown>;
      const attachmentList = dataMessage.attachments;

      if (Array.isArray(attachmentList)) {
        for (const att of attachmentList) {
          if (typeof att === "object" && att !== null) {
            const attachment = att as Record<string, unknown>;
            attachments.push({
              id: String(attachment.id || ""),
              contentType: String(attachment.contentType || ""),
              filename: attachment.fileName as string | undefined,
              size: attachment.size as number | undefined,
              path: attachment.path as string | undefined,
            });
          }
        }
      }
    }

    return attachments;
  }

  /**
   * Extract group info from envelope
   */
  private extractGroupInfo(envelope: Record<string, unknown>): SignalGroupInfo | undefined {
    if (typeof envelope.dataMessage === "object" && envelope.dataMessage !== null) {
      const dataMessage = envelope.dataMessage as Record<string, unknown>;
      const groupInfo = dataMessage.groupInfo;

      if (typeof groupInfo === "object" && groupInfo !== null) {
        const g = groupInfo as Record<string, unknown>;
        return {
          id: String(g.groupId || ""),
          name: g.name as string | undefined,
          members: g.members as string[] | undefined,
        };
      }
    }
    return undefined;
  }

  /**
   * Extract reactions from envelope
   */
  private extractReactions(envelope: Record<string, unknown>): SignalReaction[] {
    const reactions: SignalReaction[] = [];

    if (typeof envelope.dataMessage === "object" && envelope.dataMessage !== null) {
      const dataMessage = envelope.dataMessage as Record<string, unknown>;
      const reactionList = dataMessage.reactions;

      if (Array.isArray(reactionList)) {
        for (const reaction of reactionList) {
          if (typeof reaction === "object" && reaction !== null) {
            const r = reaction as Record<string, unknown>;
            reactions.push({
              reactor: String(r.reactor || r.sender || ""),
              emoji: String(r.emoji || r.value || ""),
              targetMessageId: String(r.targetSentTimestamp || ""),
            });
          }
        }
      }
    }

    return reactions;
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // If no country code, assume +1 (US)
    if (!cleaned.startsWith("+")) {
      if (cleaned.length === 10) {
        cleaned = "+1" + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        cleaned = "+" + cleaned;
      } else {
        cleaned = "+" + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Send a message
   */
  async send(message: SignalOutgoingMessage): Promise<boolean> {
    const { recipient, body, attachments } = message;

    let result;
    if (attachments && attachments.length > 0) {
      // Send with first attachment (signal-cli supports one at a time)
      const attachmentPath = attachments[0].path;
      if (!attachmentPath) {
        throw new Error("Attachment path is required for sending attachments");
      }
      result = await this.connection.sendAttachment(recipient, body, attachmentPath);
    } else {
      result = await this.connection.sendMessage(recipient, body);
    }

    return result.success;
  }

  /**
   * Send a reaction to a message
   */
  async sendReaction(recipient: string, emoji: string, messageId: string): Promise<boolean> {
    const result = await this.connection.sendReaction(recipient, emoji, messageId);
    return result.success;
  }

  /**
   * Delete a message
   */
  async deleteMessage(recipient: string, messageId: string): Promise<boolean> {
    const result = await this.connection.deleteMessage(messageId, recipient);
    return result.success;
  }

  /**
   * Emit message to all registered callbacks
   */
  private emitMessage(message: SignalReceivedMessage): void {
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch (error) {
        console.error("Error in message callback:", error);
      }
    }
  }
}

/**
 * Create a new Signal message handler
 */
export function createSignalMessageHandler(connection: SignalConnection): SignalMessageHandler {
  return new SignalMessageHandler(connection);
}
