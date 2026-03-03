import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class TailscaleAuth {
  constructor(private readonly authKey?: string) {}

  async login(): Promise<void> {
    if (!this.authKey) {
      throw new Error("missing tailscale auth key");
    }
    await execFileAsync("tailscale", ["up", "--authkey", this.authKey]);
  }

  async logout(): Promise<void> {
    await execFileAsync("tailscale", ["logout"]);
  }

  async checkAuth(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync("tailscale", ["status", "--json"]);
      const parsed = JSON.parse(stdout) as { BackendState?: string };
      return parsed.BackendState === "Running";
    } catch {
      return false;
    }
  }
}
