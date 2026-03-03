import fs from "node:fs/promises";
import { createReadStream } from "node:fs";

export class FileReader {
  async read(filePath: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  async readLines(filePath: string): Promise<string[]> {
    const content = await this.read(filePath);
    return content.split(/\r?\n/);
  }

  async *readStream(filePath: string): AsyncIterable<string> {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
