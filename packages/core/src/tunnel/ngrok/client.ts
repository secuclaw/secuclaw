import { NgrokAPI } from "./api.js";

export class NgrokClient {
  private url: string | null = null;
  private tunnelRef: string | null = null;

  constructor(private readonly api: NgrokAPI) {}

  async connect(port: number): Promise<string> {
    const tunnel = await this.api.createTunnel({
      name: `secuclaw-${port}`,
      addr: port,
      proto: "http",
    });
    this.url = tunnel.public_url;
    this.tunnelRef = tunnel.name || tunnel.id;
    return tunnel.public_url;
  }

  async disconnect(): Promise<void> {
    if (!this.tunnelRef) {
      return;
    }
    await this.api.deleteTunnel(this.tunnelRef);
    this.url = null;
    this.tunnelRef = null;
  }

  getUrl(): string {
    if (!this.url) {
      throw new Error("ngrok tunnel not connected");
    }
    return this.url;
  }
}
