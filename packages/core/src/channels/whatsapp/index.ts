// WhatsApp Channel Module
// Provides WhatsApp messaging support using @whiskeysockets/baileys

export { WhatsAppChannel, createWhatsAppChannel } from "./connection.js";
export { WhatsAppMessageHandler, createMessageHandler } from "./message.js";
export { WhatsAppAttachmentHandler, createAttachmentHandler } from "./attachment.js";

export type {
  WhatsAppConfig,
  WhatsAppChannelType,
  WhatsAppMessage,
  WhatsAppMessageType,
  WhatsAppAttachment,
  WhatsAppContact,
  WhatsAppGroupInfo,
  WhatsAppConnectionState,
  WhatsAppQRCode,
  WhatsAppMessageOptions,
  WhatsAppSendResult,
  WhatsAppReactionOptions,
  WhatsAppEventMap,
} from "./types.js";
