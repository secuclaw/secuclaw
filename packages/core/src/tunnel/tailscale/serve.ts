import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TailscaleServeEntry } from "./types.js";

const execFileAsync = promisify(execFile);

export class TailscaleServe {
  private readonly services = new Map<string, TailscaleServeEntry>();

  async serve(name: string, source: string, target: string): Promise<void> {
    await execFileAsync("tailscale", ["serve", source, target]);
    this.services.set(name, { name, source, target });
  }

  async stop(name: string): Promise<void> {
    const existing = this.services.get(name);
    if (!existing) {
      return;
    }
    await execFileAsync("tailscale", ["serve", "reset"]);
    this.services.delete(name);
  }

  list(): TailscaleServeEntry[] {
    return Array.from(this.services.values());
  }
}
