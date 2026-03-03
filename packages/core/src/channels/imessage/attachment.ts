import type { BlueBubblesAttachment, IMessageAttachmentOptions } from "./types.js";
import type { ChannelAttachment } from "../types.js";

/**
 * Attachment types supported by iMessage
 */
export type AttachmentType = "image" | "video" | "audio" | "file";

/**
 * Known iMessage MIME types
 */
export const KNOWN_MIME_TYPES: Record<string, AttachmentType> = {
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/heic": "image",
  "image/heif": "image",
  "image/webp": "image",
  "image/bmp": "image",
  "image/tiff": "image",

  // Videos
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/webm": "video",

  // Audio
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/wav": "audio",
  "audio/aac": "audio",
  "audio/m4a": "audio",

  // Other
  "application/pdf": "file",
  "text/plain": "file",
  "application/zip": "file",
};

/**
 * Detect attachment type from MIME type
 */
export function getAttachmentType(mimeType: string): AttachmentType {
  const type = KNOWN_MIME_TYPES[mimeType.toLowerCase()];
  return type ?? "file";
}

/**
 * Convert BlueBubbles attachment to ChannelAttachment
 */
export function transformAttachment(attachment: BlueBubblesAttachment): ChannelAttachment {
  const type = getAttachmentType(attachment.mimeType);

  // Map video/audio to file type since ChannelAttachment only supports image/file/link
  const channelType: "image" | "file" | "link" = 
    type === "image" ? "image" : "file";

  return {
    type: channelType,
    url: attachment.downloadUrl,
    filename: attachment.fileName,
    mimeType: attachment.mimeType,
  };
}

/**
 * Convert multiple BlueBubbles attachments
 */
export function transformAttachments(
  attachments: BlueBubblesAttachment[]
): ChannelAttachment[] {
  return attachments.map(transformAttachment);
}

/**
 * Validate attachment options before sending
 */
export function validateAttachmentOptions(
  options: IMessageAttachmentOptions
): { valid: boolean; error?: string } {
  if (!options.source && !options.data) {
    return { valid: false, error: "Either 'source' or 'data' must be provided" };
  }

  if (options.data && options.data.length === 0) {
    return { valid: false, error: "Attachment data is empty" };
  }

  // Validate MIME type if provided
  if (options.mimeType && !isValidMimeType(options.mimeType)) {
    return { valid: false, error: `Invalid MIME type: ${options.mimeType}` };
  }

  return { valid: true };
}

/**
 * Check if MIME type is valid
 */
function isValidMimeType(mimeType: string): boolean {
  return /^[a-z]+\/[a-z0-9\-+.]+$/i.test(mimeType);
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/aac": ".aac",
    "application/pdf": ".pdf",
  };

  return extensions[mimeType.toLowerCase()] ?? "";
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".m4a": "audio/m4a",
    ".pdf": "application/pdf",
  };

  return mimeTypes[extension.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Attachment size limits (in bytes)
 */
export const ATTACHMENT_LIMITS = {
  /** Maximum file size (100MB) */
  maxFileSize: 100 * 1024 * 1024,
  /** Maximum image dimension */
  maxImageDimension: 4096,
  /** Maximum video duration in seconds */
  maxVideoDuration: 600, // 10 minutes
};

/**
 * Check if attachment is within size limits
 */
export function isWithinSizeLimit(attachment: {
  fileSize?: number;
  data?: Buffer;
}): boolean {
  const size = attachment.fileSize ?? attachment.data?.length ?? 0;
  return size <= ATTACHMENT_LIMITS.maxFileSize;
}

/**
 * Attachment handler interface
 */
export interface IMessageAttachmentHandler {
  /**
   * Download attachment from BlueBubbles server
   */
  download(attachmentGuid: string): Promise<Buffer>;

  /**
   * Upload attachment to BlueBubbles server
   */
  upload(
    chatGuid: string,
    options: IMessageAttachmentOptions
  ): Promise<string>;

  /**
   * Get attachment metadata
   */
  getMetadata(attachmentGuid: string): Promise<BlueBubblesAttachment | null>;

  /**
   * Delete attachment
   */
  delete(attachmentGuid: string): Promise<void>;
}

/**
 * Create attachment options from various sources
 */
export function createAttachmentOptions(
  source: string | Buffer,
  options?: Partial<IMessageAttachmentOptions>
): IMessageAttachmentOptions {
  if (typeof source === "string") {
    return {
      source,
      mimeType: options?.mimeType,
      filename: options?.filename,
    };
  }

  return {
    data: source,
    mimeType: options?.mimeType,
    filename: options?.filename,
  };
}
