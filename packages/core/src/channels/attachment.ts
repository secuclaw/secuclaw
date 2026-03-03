export enum AttachmentType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
  LINK = "link",
}

export interface Attachment {
  type: AttachmentType;
  url?: string;
  data?: Buffer;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export class AttachmentBuilder {
  private attachment: Attachment;

  constructor(type: AttachmentType) {
    this.attachment = { type };
  }

  withUrl(url: string): this {
    this.attachment.url = url;
    return this;
  }

  withData(data: Buffer): this {
    this.attachment.data = data;
    return this;
  }

  withFilename(filename: string): this {
    this.attachment.filename = filename;
    return this;
  }

  withMimeType(mimeType: string): this {
    this.attachment.mimeType = mimeType;
    return this;
  }

  withSize(sizeBytes: number): this {
    this.attachment.sizeBytes = sizeBytes;
    return this;
  }

  build(): Attachment {
    return { ...this.attachment };
  }
}
