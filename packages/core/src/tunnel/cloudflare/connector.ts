import { spawn, type ChildProcess } from "node:child_process";
import type { CloudflareConnectorOptions, CloudflareStatus } from "./types.js";

export class CloudflareConnector {
  private process: ChildProcess | null = null;
  private status: CloudflareStatus = { connected: false };

  constructor(private readonly options: CloudflareConnectorOptions) {}

  async start(): Promise<void> {
    if (this.process) {
      return;
    }

    const args = [
      "tunnel",
      "run",
      "--credentials-file",
      this.options.credentialsFile,
      this.options.tunnelId,
    ];

    if (this.options.configFile) {
      args.unshift("--config", this.options.configFile);
    }

    this.process = spawn("cloudflared", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.status = {
      connected: true,
      tunnelId: this.options.tunnelId,
      startedAt: Date.now(),
    };

    this.process.once("exit", () => {
      this.status.connected = false;
      this.process = null;
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.status.connected = false;
      return;
    }

    this.process.kill("SIGTERM");
    this.process = null;
    this.status.connected = false;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  getStatus(): CloudflareStatus {
    return { ...this.status };
  }
}
