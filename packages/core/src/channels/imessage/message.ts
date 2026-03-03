import type {
  BlueBubblesMessage,
  BlueBubblesChat,
  IMessageMessage,
} from "./types.js";

/**
 * Message handler interface for iMessage
 */
export interface IMessageHandler {
  /**
   * Handle incoming message
   */
  onMessage(message: IMessageMessage): void;

  /**
   * Mark message as read
   */
  markAsRead(chatGuid: string, messageGuid?: string): Promise<void>;

  /**
   * Delete a message
   */
  deleteMessage(chatGuid: string, messageGuid: string): Promise<void>;

  /**
   * Get chat history
   */
  getHistory(chatGuid: string, limit?: number): Promise<IMessageMessage[]>;
}

/**
 * Converts BlueBubbles message to IMessageMessage format
 */
export function transformMessage(message: BlueBubblesMessage): IMessageMessage {
  return {
    id: message.guid,
    channelId: message.chatGuid,
    userId: message.handle?.address ?? "unknown",
    content: message.text ?? "",
    timestamp: message.dateCreated,
    isFromMe: message.isFromMe,
    chatGuid: message.chatGuid,
    metadata: {
      subject: message.subject,
      attachments: message.attachments,
      handle: message.handle,
    },
  };
}

/**
 * Converts multiple BlueBubbles messages
 */
export function transformMessages(messages: BlueBubblesMessage[]): IMessageMessage[] {
  return messages.map(transformMessage);
}

/**
 * Creates a chat identifier from participants
 */
export function getChatDisplayName(chat: BlueBubblesChat): string {
  if (chat.displayName) {
    return chat.displayName;
  }

  if (chat.participants.length === 0) {
    return "Unknown Chat";
  }

  if (chat.participants.length === 1) {
    return chat.participants[0].displayName ?? chat.participants[0].address;
  }

  const otherParticipants = chat.participants.filter((p) => !p.isMe);
  if (otherParticipants.length === 1) {
    return otherParticipants[0].displayName ?? otherParticipants[0].address;
  }

  return `${otherParticipants.length} participants`;
}

/**
 * Extract user identifier from chat
 */
export function getChatUserId(chat: BlueBubblesChat): string {
  const otherParticipant = chat.participants.find((p) => !p.isMe);
  return otherParticipant?.address ?? "unknown";
}

/**
 * Check if message is a tapback
 */
export function isTapback(message: BlueBubblesMessage): boolean {
  return message.type === "tapback";
}

/**
 * Check if message contains attachments
 */
export function hasAttachments(message: BlueBubblesMessage): boolean {
  return (
    Array.isArray(message.attachments) &&
    message.attachments.length > 0
  );
}

/**
 * Check if message is a sticker
 */
export function isSticker(message: BlueBubblesMessage): boolean {
  return message.type === "sticker";
}

/**
 * Check if message is from group chat
 */
export function isGroupChat(chat: BlueBubblesChat): boolean {
  return chat.isGroup;
}

/**
 * Format message for display
 */
export function formatMessagePreview(message: BlueBubblesMessage): string {
  const parts: string[] = [];

  if (message.subject) {
    parts.push(`[${message.subject}]`);
  }

  if (message.text) {
    parts.push(message.text);
  }

  if (hasAttachments(message)) {
    const attachmentCount = message.attachments!.length;
    parts.push(`[${attachmentCount} attachment${attachmentCount > 1 ? "s" : ""}]`);
  }

  return parts.join(" ");
}

/**
 * Message filter options
 */
export interface MessageFilterOptions {
  /** Filter by sender */
  fromMe?: boolean;
  /** Filter by date range */
  since?: number;
  until?: number;
  /** Include only messages with attachments */
  hasAttachments?: boolean;
  /** Search text content */
  searchText?: string;
}

/**
 * Filter messages based on options
 */
export function filterMessages(
  messages: BlueBubblesMessage[],
  options: MessageFilterOptions
): BlueBubblesMessage[] {
  return messages.filter((msg) => {
    if (options.fromMe !== undefined && msg.isFromMe !== options.fromMe) {
      return false;
    }

    if (options.since && msg.dateCreated < options.since) {
      return false;
    }

    if (options.until && msg.dateCreated > options.until) {
      return false;
    }

    if (options.hasAttachments && !hasAttachments(msg)) {
      return false;
    }

    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      const textMatch = msg.text?.toLowerCase().includes(searchLower);
      const subjectMatch = msg.subject?.toLowerCase().includes(searchLower);
      if (!textMatch && !subjectMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort messages by date (newest first)
 */
export function sortMessagesByDate(
  messages: BlueBubblesMessage[],
  ascending = false
): BlueBubblesMessage[] {
  return [...messages].sort((a, b) => {
    const diff = a.dateCreated - b.dateCreated;
    return ascending ? diff : -diff;
  });
}

/**
 * Group messages by conversation
 */
export function groupMessagesByChat(
  messages: BlueBubblesMessage[]
): Map<string, BlueBubblesMessage[]> {
  const groups = new Map<string, BlueBubblesMessage[]>();

  for (const msg of messages) {
    const existing = groups.get(msg.chatGuid) ?? [];
    existing.push(msg);
    groups.set(msg.chatGuid, existing);
  }

  return groups;
}

/**
 * iMessage effect types
 */
export const IMessageEffects = {
  /** Big emoji effect */
  screen: "screen",
  /** Balloon effect */
  balloon: "balloon",
  /** Confetti effect */
  confetti: "confetti",
  /** Heart effect */
  heart: "heart",
  /** Star effect */
  star: "star",
  /** Fire effect */
  fire: "fire",
  /** Sparkle effect */
  sparkle: "sparkle",
} as const;

export type IMessageEffectType =
  (typeof IMessageEffects)[keyof typeof IMessageEffects];

/**
 * iMessage tapback types
 */
export const TapbackTypes = {
  love: "love",
  like: "like",
  dislike: "dislike",
  laugh: "laugh",
  emphasize: "emphasize",
  question: "question",
} as const;

export type TapbackType = (typeof TapbackTypes)[keyof typeof TapbackTypes];
