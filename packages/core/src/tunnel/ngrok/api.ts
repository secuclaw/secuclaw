import type { CreateTunnelRequest, NgrokTunnel } from "./types.js";

export class NgrokAPI {
  constructor(
    private readonly endpoint: string = "http://127.0.0.1:4040/api",
    private readonly apiKey?: string,
  ) {}

  async listTunnels(): Promise<NgrokTunnel[]> {
    const response = await fetch(`${this.endpoint}/tunnels`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`ngrok list failed: ${response.status}`);
    }
    const data = (await response.json()) as { tunnels: NgrokTunnel[] };
    return data.tunnels ?? [];
  }

  async createTunnel(payload: CreateTunnelRequest): Promise<NgrokTunnel> {
    const response = await fetch(`${this.endpoint}/tunnels`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`ngrok create failed: ${response.status}`);
    }
    return (await response.json()) as NgrokTunnel;
  }

  async deleteTunnel(nameOrId: string): Promise<void> {
    const response = await fetch(`${this.endpoint}/tunnels/${encodeURIComponent(nameOrId)}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`ngrok delete failed: ${response.status}`);
    }
  }

  private authHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {};
    }
    return {
      authorization: `Bearer ${this.apiKey}`,
    };
  }
}
