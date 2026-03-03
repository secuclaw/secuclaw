import WebSocket from "ws";
import { BaseTunnel } from "./base.js";

export class WebSocketTunnel extends BaseTunnel {
  private socket: WebSocket | null = null;

  async connect(): Promise<void> {
    if (this.socket) {
      return;
    }

    const endpoint = this.options.target.startsWith("ws")
      ? this.options.target
      : `ws://${this.options.target}`;

    this.socket = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("socket not initialized"));
        return;
      }
      this.socket.once("open", () => resolve());
      this.socket.once("error", (err) => reject(err));
    });

    this.connected = true;
    this.startedAt = Date.now();
    this.url = endpoint;

    this.socket.once("close", () => {
      this.connected = false;
      this.socket = null;
    });
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      this.connected = false;
      return;
    }

    await new Promise<void>((resolve) => {
      this.socket?.once("close", () => resolve());
      this.socket?.close();
    });

    this.connected = false;
    this.socket = null;
  }
}
