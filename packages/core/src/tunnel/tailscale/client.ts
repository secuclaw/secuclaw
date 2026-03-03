import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TailscaleStatus } from "./types.js";

const execFileAsync = promisify(execFile);

export class TailscaleClient {
  private connected = false;

  async connect(): Promise<void> {
    await execFileAsync("tailscale", ["up"]);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await execFileAsync("tailscale", ["down"]);
    this.connected = false;
  }

  async getStatus(): Promise<TailscaleStatus> {
    try {
      const { stdout } = await execFileAsync("tailscale", ["status", "--json"]);
      const parsed = JSON.parse(stdout) as {
        BackendState?: string;
        Health?: string[];
      };
      return {
        connected: parsed.BackendState === "Running",
        backendState: parsed.BackendState,
        health: parsed.Health,
        raw: parsed,
      };
    } catch {
      return {
        connected: this.connected,
      };
    }
  }
}
