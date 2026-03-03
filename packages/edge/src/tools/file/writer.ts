import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";

export class FileWriter {
  async write(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, "utf8");
  }

  async append(filePath: string, content: string): Promise<void> {
    await fs.appendFile(filePath, content, "utf8");
  }

  async writeStream(filePath: string, chunks: Iterable<string>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath, { encoding: "utf8" });
      stream.on("error", reject);
      stream.on("finish", resolve);
      for (const chunk of chunks) {
        stream.write(chunk);
      }
      stream.end();
    });
  }
}
