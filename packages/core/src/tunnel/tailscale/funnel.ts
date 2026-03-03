import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TailscaleFunnelStatus } from "./types.js";

const execFileAsync = promisify(execFile);

export class TailscaleFunnel {
  private status: TailscaleFunnelStatus = { enabled: false };

  async enable(target: string): Promise<void> {
    await execFileAsync("tailscale", ["funnel", target]);
    this.status = {
      enabled: true,
      target,
    };
  }

  async disable(): Promise<void> {
    await execFileAsync("tailscale", ["funnel", "reset"]);
    this.status = { enabled: false };
  }

  getStatus(): TailscaleFunnelStatus {
    return { ...this.status };
  }
}
