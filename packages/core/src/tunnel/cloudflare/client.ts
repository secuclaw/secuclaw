import { CloudflareConnector } from "./connector.js";
import type { CloudflareStatus } from "./types.js";

export class CloudflareClient {
  constructor(private readonly connector: CloudflareConnector) {}

  async connect(): Promise<void> {
    await this.connector.start();
  }

  async disconnect(): Promise<void> {
    await this.connector.stop();
  }

  getStatus(): CloudflareStatus {
    return this.connector.getStatus();
  }
}
