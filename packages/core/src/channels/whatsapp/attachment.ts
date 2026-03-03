import type { WASocket, proto } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

import type { WhatsAppAttachment } from "./types.js";

// WhatsApp media size limits (in bytes)
const MEDIA_LIMITS = {
  image: 16 * 1024 * 1024, // 16MB
  document: 64 * 1024 * 1024, // 64MB
  video: 64 * 1024 * 1024, // 64MB
  audio: 16 * 1024 * 1024, // 16MB
  voice: 16 * 1024 * 1024, // 16MB
};

export class WhatsAppAttachmentHandler {
  private socket: WASocket | null = null;
  private downloadPath: string = "/tmp/whatsapp-media";

  setSocket(socket: WASocket | null): void {
    this.socket = socket;
  }

  setDownloadPath(path: string): void {
    this.downloadPath = path;
  }

  async sendImage(
    recipient: string,
    image: Buffer | string,
    options?: {
      caption?: string;
      quotedMessageId?: string;
      mentionedJids?: string[];
    },
  ): Promise<{ id: string; mediaUrl?: string }> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);

    const message: proto.IMessage = {
      image: {},
    };

    if (Buffer.isBuffer(image)) {
      message.image = { buffer: image };
    } else {
      message.image = { url: image };
    }

    if (options?.caption) {
      message.image!.caption = options.caption;
    }

    const result = await this.socket!.sendMessage(jid, message, {
      quoted: options?.quotedMessageId
        ? { key: { id: options.quotedMessageId } }
        : undefined,
      mentions: options?.mentionedJids,
    });

    return {
      id: result.key.id ?? "",
      mediaUrl: result.message?.imageMessage?.url,
    };
  }

  async sendVideo(
    recipient: string,
    video: Buffer | string,
    options?: {
      caption?: string;
      gif?: boolean;
      quotedMessageId?: string;
    },
  ): Promise<{ id: string; mediaUrl?: string }> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);

    const message: proto.IMessage = {
      video: {},
    };

    if (Buffer.isBuffer(video)) {
      message.video = { buffer: video };
    } else {
      message.video = { url: video };
    }

    if (options?.caption) {
      message.video!.caption = options.caption;
    }

    if (options?.gif) {
      message.video!.gifPlayback = true;
    }

    const result = await this.socket!.sendMessage(jid, message, {
      quoted: options?.quotedMessageId
        ? { key: { id: options.quotedMessageId } }
        : undefined,
    });

    return {
      id: result.key.id ?? "",
      mediaUrl: result.message?.videoMessage?.url,
    };
  }

  async sendAudio(
    recipient: string,
    audio: Buffer | string,
    options?: {
      ptt?: boolean;
      quotedMessageId?: string;
    },
  ): Promise<{ id: string; mediaUrl?: string }> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);

    const message: proto.IMessage = {
      audio: {},
    };

    if (Buffer.isBuffer(audio)) {
      message.audio = { buffer: audio };
    } else {
      message.audio = { url: audio };
    }

    if (options?.ptt !== undefined) {
      message.audio!.ptt = options.ptt;
    }

    const result = await this.socket!.sendMessage(jid, message, {
      quoted: options?.quotedMessageId
        ? { key: { id: options.quotedMessageId } }
        : undefined,
    });

    return {
      id: result.key.id ?? "",
      mediaUrl: result.message?.audioMessage?.url,
    };
  }

  async sendDocument(
    recipient: string,
    document: Buffer | string,
    fileName: string,
    options?: {
      mimeType?: string;
      caption?: string;
      quotedMessageId?: string;
    },
  ): Promise<{ id: string; mediaUrl?: string }> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);

    const message: proto.IMessage = {
      document: {},
    };

    if (Buffer.isBuffer(document)) {
      message.document = { buffer: document };
    } else {
      message.document = { url: document };
    }

    message.document!.fileName = fileName;

    if (options?.mimeType) {
      message.document!.mimetype = options.mimeType;
    }

    if (options?.caption) {
      message.document!.caption = options.caption;
    }

    const result = await this.socket!.sendMessage(jid, message, {
      quoted: options?.quotedMessageId
        ? { key: { id: options.quotedMessageId } }
        : undefined,
    });

    return {
      id: result.key.id ?? "",
      mediaUrl: result.message?.documentMessage?.url,
    };
  }

  async sendSticker(
    recipient: string,
    sticker: Buffer | string,
    options?: {
      quotedMessageId?: string;
    },
  ): Promise<{ id: string; mediaUrl?: string }> {
    this.ensureSocket();

    const jid = this.normalizeJid(recipient);

    const message: proto.IMessage = {
      sticker: {},
    };

    if (Buffer.isBuffer(sticker)) {
      message.sticker = { buffer: sticker };
    } else {
      message.sticker = { url: sticker };
    }

    const result = await this.socket!.sendMessage(jid, message, {
      quoted: options?.quotedMessageId
        ? { key: { id: options.quotedMessageId } }
        : undefined,
    });

    return {
      id: result.key.id ?? "",
      mediaUrl: result.message?.stickerMessage?.url,
    };
  }

  async downloadMedia(
    message: {
      message?: Record<string, unknown>;
    },
    options?: {
      outputPath?: string;
      asBuffer?: boolean;
    },
  ): Promise<Buffer | string> {
    this.ensureSocket();

    const mediaMessage = this.extractMediaMessage(message.message);
    if (!mediaMessage) {
      throw new Error("No media found in message");
    }

    try {
      const buffer = await downloadMediaMessage(
        this.socket!,
        {
          key: {
            id: "",
            remoteJid: "",
          },
          message: message.message,
        } as proto.IWebMessageInfo,
        "buffer",
        {},
      );

      if (options?.asBuffer) {
        if (buffer instanceof Buffer) {
          return buffer;
        }
        // If it's a stream, convert to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of buffer as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }

      const outputBuffer = buffer instanceof Buffer ? buffer : await (async () => {
        const chunks: Uint8Array[] = [];
        for await (const chunk of buffer as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      })();
      const outputPath = options?.outputPath ?? this.generateFilePath(mediaMessage);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, outputBuffer);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to download media: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async downloadMediaToStream(
    message: {
      message?: Record<string, unknown>;
    },
    outputPath: string,
  ): Promise<string> {
    this.ensureSocket();

    const mediaMessage = this.extractMediaMessage(message.message);
    if (!mediaMessage) {
      throw new Error("No media found in message");
    }

    try {
      const stream = await downloadMediaMessage(
        this.socket!,
        {
          key: {
            id: "",
            remoteJid: "",
          },
          message: message.message,
        } as proto.IWebMessageInfo,
        "stream",
        {},
      );

      await mkdir(dirname(outputPath), { recursive: true });
      const writeStream = createWriteStream(outputPath);
      await pipeline(stream as AsyncIterable<Buffer>, writeStream);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to download media to stream: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  getMediaType(message: Record<string, unknown>): "image" | "video" | "audio" | "document" | "sticker" | null {
    if (message.imageMessage) return "image";
    if (message.videoMessage) return "video";
    if (message.audioMessage) return "audio";
    if (message.documentMessage) return "document";
    if (message.stickerMessage) return "sticker";
    return null;
  }

  getMediaInfo(message: Record<string, unknown>): WhatsAppAttachment | null {
    const imageMessage = message.imageMessage as {
      url?: string;
      mimetype?: string;
      caption?: string;
      fileLength?: string;
      height?: number;
      width?: number;
    } | null;

    if (imageMessage) {
      return {
        type: "image",
        mimeType: imageMessage.mimetype ?? "image/jpeg",
        caption: imageMessage.caption,
        fileSize: imageMessage.fileLength ? parseInt(imageMessage.fileLength, 10) : undefined,
        url: imageMessage.url,
      };
    }

    const videoMessage = message.videoMessage as {
      url?: string;
      mimetype?: string;
      caption?: string;
      fileLength?: string;
      seconds?: number;
    } | null;

    if (videoMessage) {
      return {
        type: "file",
        mimeType: videoMessage.mimetype ?? "video/mp4",
        caption: videoMessage.caption,
        fileSize: videoMessage.fileLength ? parseInt(videoMessage.fileLength, 10) : undefined,
        duration: videoMessage.seconds,
        url: videoMessage.url,
      };
    }

    const audioMessage = message.audioMessage as {
      url?: string;
      mimetype?: string;
      fileLength?: string;
      seconds?: number;
    } | null;

    if (audioMessage) {
      return {
        type: "file",
        mimeType: audioMessage.mimetype ?? "audio/ogg",
        fileSize: audioMessage.fileLength ? parseInt(audioMessage.fileLength, 10) : undefined,
        duration: audioMessage.seconds,
        url: audioMessage.url,
      };
    }

    const documentMessage = message.documentMessage as {
      url?: string;
      mimetype?: string;
      fileName?: string;
      fileLength?: string;
      pageCount?: number;
    } | null;

    if (documentMessage) {
      return {
        type: "file",
        mimeType: documentMessage.mimetype ?? "application/octet-stream",
        fileName: documentMessage.fileName,
        fileSize: documentMessage.fileLength ? parseInt(documentMessage.fileLength, 10) : undefined,
        url: documentMessage.url,
      };
    }

    const stickerMessage = message.stickerMessage as {
      url?: string;
      mimetype?: string;
      fileLength?: string;
    } | null;

    if (stickerMessage) {
      return {
        type: "file",
        mimeType: stickerMessage.mimetype ?? "image/webp",
        fileSize: stickerMessage.fileLength ? parseInt(stickerMessage.fileLength, 10) : undefined,
        url: stickerMessage.url,
      };
    }

    return null;
  }

  validateMediaSize(
    mediaType: "image" | "video" | "audio" | "document" | "voice",
    size: number,
  ): boolean {
    const limit = MEDIA_LIMITS[mediaType];
    return size <= limit;
  }

  getMaxMediaSize(mediaType: keyof typeof MEDIA_LIMITS): number {
    return MEDIA_LIMITS[mediaType];
  }

  private extractMediaMessage(
    message?: Record<string, unknown>,
  ): Record<string, unknown> | null {
    if (!message) return null;

    const msg = message as {
      imageMessage?: Record<string, unknown>;
      videoMessage?: Record<string, unknown>;
      audioMessage?: Record<string, unknown>;
      documentMessage?: Record<string, unknown>;
      stickerMessage?: Record<string, unknown>;
    };

    return (
      msg.imageMessage ??
      msg.videoMessage ??
      msg.audioMessage ??
      msg.documentMessage ??
      msg.stickerMessage ??
      null
    );
  }

  private generateFilePath(mediaMessage: Record<string, unknown>): string {
    const timestamp = Date.now();
    const mediaType = Object.keys(mediaMessage)[0]?.replace("Message", "") ?? "file";
    return join(this.downloadPath, `${mediaType}-${timestamp}`);
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

export function createAttachmentHandler(): WhatsAppAttachmentHandler {
  return new WhatsAppAttachmentHandler();
}
