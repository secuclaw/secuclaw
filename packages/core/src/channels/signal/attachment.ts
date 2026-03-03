import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync, createReadStream } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import type { SignalAttachment } from "./types.js";
import { SignalConnection } from "./connection.js";

/**
 * Attachment handling for Signal channel
 */
export class SignalAttachmentHandler {
  private connection: SignalConnection;
  private downloadDir: string;
  private maxAttachmentSize: number;

  constructor(connection: SignalConnection, downloadDir?: string, maxSize?: number) {
    this.connection = connection;
    this.downloadDir = downloadDir || join(tmpdir(), "secuclaw-signal-attachments");
    this.maxAttachmentSize = maxSize || 100 * 1024 * 1024; // Default 100MB
  }

  /**
   * Get the download directory for attachments
   */
  getDownloadDirectory(): string {
    return this.downloadDir;
  }

  /**
   * Set the download directory
   */
  async setDownloadDirectory(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    this.downloadDir = dir;
  }

  /**
   * Get maximum attachment size
   */
  getMaxAttachmentSize(): number {
    return this.maxAttachmentSize;
  }

  /**
   * Set maximum attachment size
   */
  setMaxAttachmentSize(size: number): void {
    this.maxAttachmentSize = size;
  }

  /**
   * Check if an attachment is within size limits
   */
  isWithinSizeLimit(size: number): boolean {
    return size <= this.maxAttachmentSize;
  }

  /**
   * Download an attachment from a URL
   */
  async downloadFromUrl(url: string, filename?: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!this.isWithinSizeLimit(size)) {
        throw new Error(`Attachment too large: ${size} bytes (max: ${this.maxAttachmentSize})`);
      }
    }

    const name = filename || this.generateFilename(url);
    const filePath = join(this.downloadDir, name);

    // Ensure directory exists
    await mkdir(this.downloadDir, { recursive: true });

    const buffer = await response.arrayBuffer();
    await writeFile(filePath, Buffer.from(buffer));

    return filePath;
  }

  /**
   * Read attachment data as buffer
   */
  async readAttachment(filePath: string): Promise<Buffer> {
    if (!existsSync(filePath)) {
      throw new Error(`Attachment not found: ${filePath}`);
    }
    return readFile(filePath);
  }

  /**
   * Get attachment info
   */
  async getAttachmentInfo(filePath: string): Promise<{ size: number; filename: string } | null> {
    if (!existsSync(filePath)) {
      return null;
    }

    const { stat } = await import("fs/promises");
    const fileStat = await stat(filePath);

    return {
      size: fileStat.size,
      filename: basename(filePath),
    };
  }

  /**
   * Determine MIME type from filename
   */
  getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop() || "";

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",

      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      aac: "audio/aac",

      // Video
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",

      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      txt: "text/plain",
      rtf: "application/rtf",
      odt: "application/vnd.oasis.opendocument.text",
      ods: "application/vnd.oasis.opendocument.spreadsheet",

      // Archives
      zip: "application/zip",
      "7z": "application/x-7z-compressed",
      rar: "application/vnd.rar",
      tar: "application/x-tar",
      gz: "application/gzip",

      // Code
      js: "application/javascript",
      ts: "application/typescript",
      json: "application/json",
      xml: "application/xml",
      html: "text/html",
      css: "text/css",
      py: "text/x-python",
      java: "text/x-java-source",
      c: "text/x-csrc",
      cpp: "text/x-c++src",
      h: "text/x-chdr",
      sh: "application/x-sh",
      bash: "application/x-sh",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Validate attachment file
   */
  async validateAttachment(filePath: string): Promise<{ valid: boolean; error?: string }> {
    if (!existsSync(filePath)) {
      return { valid: false, error: "File does not exist" };
    }

    const { stat } = await import("fs/promises");
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return { valid: false, error: "Path is not a file" };
    }

    if (fileStat.size === 0) {
      return { valid: false, error: "File is empty" };
    }

    if (!this.isWithinSizeLimit(fileStat.size)) {
      return { valid: false, error: `File too large: ${fileStat.size} bytes (max: ${this.maxAttachmentSize})` };
    }

    return { valid: true };
  }

  /**
   * Create a Signal attachment object from a local file
   */
  async createAttachmentFromFile(filePath: string): Promise<SignalAttachment> {
    const validation = await this.validateAttachment(filePath);
    if (!validation.valid) {
      throw new Error(`Invalid attachment: ${validation.error}`);
    }

    const info = await this.getAttachmentInfo(filePath);
    if (!info) {
      throw new Error(`Failed to get attachment info for: ${filePath}`);
    }
    const { size, filename } = info;
    const mimeType = this.getMimeType(filename);

    return {
      id: this.generateAttachmentId(),
      contentType: mimeType,
      filename,
      size,
      path: filePath,
    };
  }

  /**
   * Generate unique attachment ID
   */
  private generateAttachmentId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Generate filename from URL
   */
  private generateFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const name = basename(pathname);

      if (name && name.length > 0 && !name.includes("%")) {
        return name;
      }
    } catch {
      // Fall through to default
    }

    // Generate a random filename
    const ext = "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `attachment_${timestamp}_${random}.${ext}`;
  }

  /**
   * Create a stream for sending an attachment
   */
  createReadStream(filePath: string): ReturnType<typeof createReadStream> {
    return createReadStream(filePath);
  }

  /**
   * Clean up attachments older than specified age
   */
  async cleanupOldAttachments(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!existsSync(this.downloadDir)) {
      return 0;
    }

    const { readdir, rm, stat } = await import("fs/promises");
    const files = await readdir(this.downloadDir);

    let deletedCount = 0;
    const now = Date.now();

    for (const file of files) {
      try {
        const filePath = join(this.downloadDir, file);
        const fileStat = await stat(filePath);

        if (fileStat.isFile() && now - fileStat.mtimeMs > maxAgeMs) {
          await rm(filePath);
          deletedCount++;
        }
      } catch {
        // Skip files that can't be accessed
      }
    }

    return deletedCount;
  }
}

/**
 * Create a new Signal attachment handler
 */
export function createSignalAttachmentHandler(
  connection: SignalConnection,
  downloadDir?: string,
  maxSize?: number
): SignalAttachmentHandler {
  return new SignalAttachmentHandler(connection, downloadDir, maxSize);
}
