import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import * as path from "node:path";

// Security: Allowed base directory for file operations
const DEFAULT_ALLOWED_DIR = process.env.FILE_ALLOWED_DIR || process.cwd();

// Security: Validate path to prevent path traversal
function validatePath(filePath: string, allowedDir: string = DEFAULT_ALLOWED_DIR): { valid: boolean; resolved?: string; error?: string } {
  try {
    // Resolve to absolute path
    const resolved = path.resolve(filePath);
    const allowedResolved = path.resolve(allowedDir);
    
    // Check for path traversal attempts
    if (filePath.includes("..")) {
      return { valid: false, error: "Path traversal detected" };
    }
    
    // Check for null bytes (can be used to bypass checks)
    if (filePath.includes("\0")) {
      return { valid: false, error: "Null byte in path" };
    }
    
    // Check if the resolved path is within the allowed directory
    if (!resolved.startsWith(allowedResolved + path.sep) && resolved !== allowedResolved) {
      return { valid: false, error: "Path is outside allowed directory" };
    }
    
    return { valid: true, resolved };
  } catch (error) {
    return { valid: false, error: "Invalid path" };
  }
}

export class FileReader {
  private allowedDir: string;
  
  constructor(allowedDir?: string) {
    this.allowedDir = allowedDir ?? DEFAULT_ALLOWED_DIR;
  }
  
  async read(filePath: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    // Security: Validate path
    const validation = validatePath(filePath, this.allowedDir);
    if (!validation.valid) {
      throw new Error(`Security error: ${validation.error}`);
    }
    
    return fs.readFile(validation.resolved!, encoding);
  }

  async readLines(filePath: string): Promise<string[]> {
    const content = await this.read(filePath);
    return content.split(/\r?\n/);
  }

  async *readStream(filePath: string): AsyncIterable<string> {
    // Security: Validate path
    const validation = validatePath(filePath, this.allowedDir);
    if (!validation.valid) {
      throw new Error(`Security error: ${validation.error}`);
    }
    
    const stream = createReadStream(validation.resolved!, { encoding: "utf8" });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
