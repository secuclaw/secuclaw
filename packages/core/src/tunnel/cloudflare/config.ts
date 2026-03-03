import fs from "node:fs/promises";
import path from "node:path";
import type { CloudflareConnectorOptions } from "./types.js";

export class CloudflareConfig {
  constructor(private readonly filePath: string) {}

  async load(): Promise<CloudflareConnectorOptions> {
    const content = await fs.readFile(this.filePath, "utf8");
    const parsed = JSON.parse(content) as CloudflareConnectorOptions;
    this.validate(parsed);
    return parsed;
  }

  async save(config: CloudflareConnectorOptions): Promise<void> {
    this.validate(config);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(config, null, 2), "utf8");
  }

  validate(config: CloudflareConnectorOptions): boolean {
    if (!config.tunnelId.trim()) {
      throw new Error("missing tunnelId");
    }
    if (!config.credentialsFile.trim()) {
      throw new Error("missing credentialsFile");
    }
    return true;
  }
}
