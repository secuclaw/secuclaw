import fs from "node:fs/promises";
import { FileReader } from "./reader.js";
import { FileWriter } from "./writer.js";
import { FileScanner } from "./scanner.js";
import { FileGuard } from "./guard.js";

export class EdgeFileTool {
  private readonly reader = new FileReader();
  private readonly writer = new FileWriter();
  private readonly scanner = new FileScanner();
  private readonly guard: FileGuard;

  constructor(guard?: FileGuard) {
    this.guard = guard ?? new FileGuard();
  }

  async read(filePath: string): Promise<string> {
    this.guard.restrict(filePath);
    await this.enforceSize(filePath);
    return this.reader.read(filePath);
  }

  async write(filePath: string, content: string): Promise<void> {
    this.guard.restrict(filePath);
    if (Buffer.byteLength(content, "utf8") > this.guard.getMaxFileSizeBytes()) {
      throw new Error("content exceeds max file size");
    }
    await this.writer.write(filePath, content);
  }

  async list(dir: string): Promise<string[]> {
    this.guard.restrict(dir);
    return this.scanner.scan(dir);
  }

  isAllowed(filePath: string): boolean {
    return this.guard.validate(filePath);
  }

  private async enforceSize(filePath: string): Promise<void> {
    const stat = await fs.stat(filePath);
    if (stat.size > this.guard.getMaxFileSizeBytes()) {
      throw new Error(`file exceeds max size: ${stat.size}`);
    }
  }
}
