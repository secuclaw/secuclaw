// iMessage Channel - BlueBubbles REST API Integration
// Export all iMessage channel components

// Main channel implementation
export {
  IMessageChannel,
  createIMessageChannel,
} from "./connection.js";

// Types
export type {
  IMessageConfig,
  IMessageMessage,
  IMessageSendOptions,
  IMessageAttachmentOptions,
  IMessageConnectionState,
  BlueBubblesResponse,
  BlueBubblesChat,
  BlueBubblesMessage,
  BlueBubblesParticipant,
  BlueBubblesHandle,
  BlueBubblesAttachment,
  BlueBubblesWebhookPayload,
} from "./types.js";

// Message handling utilities
export type { IMessageHandler } from "./message.js";
  export {
  transformMessage,
  transformMessages,
  getChatDisplayName,
  getChatUserId,
  isTapback,
  hasAttachments,
  isSticker,
  isGroupChat,
  formatMessagePreview,
  filterMessages,
  sortMessagesByDate,
  groupMessagesByChat,
  IMessageEffects,
  TapbackTypes,
  type MessageFilterOptions,
  type IMessageEffectType,
  type TapbackType,
} from "./message.js";

// Attachment handling utilities
export {
  transformAttachment,
  transformAttachments,
  validateAttachmentOptions,
  getAttachmentType,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  formatFileSize,
  isWithinSizeLimit,
  createAttachmentOptions,
  KNOWN_MIME_TYPES,
  ATTACHMENT_LIMITS,
  type AttachmentType,
  type IMessageAttachmentHandler,
} from "./attachment.js";
