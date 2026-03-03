import fs from "node:fs/promises";
import path from "node:path";

export class FileScanner {
  async scan(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.scan(full);
        files.push(...nested);
      } else {
        files.push(full);
      }
    }
    return files;
  }

  match(files: string[], pattern: RegExp): string[] {
    return files.filter((f) => pattern.test(f));
  }

  filter(files: string[], predicate: (filePath: string) => boolean): string[] {
    return files.filter(predicate);
  }
}
