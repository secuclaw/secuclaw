import type { TunnelOptions, TunnelStatus } from "./types.js";

export abstract class BaseTunnel {
  protected connected = false;
  protected url: string | undefined;
  protected startedAt: number | undefined;

  constructor(public readonly options: TunnelOptions) {}

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  getUrl(): string {
    if (!this.url) {
      throw new Error("tunnel not connected");
    }
    return this.url;
  }

  getStatus(): TunnelStatus {
    return {
      connected: this.connected,
      url: this.url,
      startedAt: this.startedAt,
    };
  }
}
