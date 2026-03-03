import { spawn, type ChildProcess } from "node:child_process";
import { BaseTunnel } from "./base.js";

export class SSHTunnel extends BaseTunnel {
  private process: ChildProcess | null = null;

  async connect(): Promise<void> {
    if (this.process) {
      return;
    }

    const host = this.options.host ?? "127.0.0.1";
    const user = this.options.user ?? process.env.USER ?? "root";
    const localPort = this.options.localPort ?? 8080;
    const remotePort = this.options.remotePort ?? 80;

    this.process = spawn("ssh", [
      "-N",
      "-L",
      `${localPort}:${this.options.target}:${remotePort}`,
      `${user}@${host}`,
    ]);

    this.connected = true;
    this.startedAt = Date.now();
    this.url = `http://127.0.0.1:${localPort}`;

    this.process.once("exit", () => {
      this.connected = false;
      this.process = null;
    });
  }

  async disconnect(): Promise<void> {
    if (!this.process) {
      this.connected = false;
      return;
    }
    this.process.kill("SIGTERM");
    this.process = null;
    this.connected = false;
  }
}
