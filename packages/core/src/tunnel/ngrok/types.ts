export interface NgrokTunnel {
  id: string;
  name: string;
  public_url: string;
  proto: string;
  addr: string;
}

export interface CreateTunnelRequest {
  name?: string;
  addr: number | string;
  proto: "http" | "tcp" | "tls";
  domain?: string;
}

export interface WebhookEvent {
  event: string;
  payload: Record<string, unknown>;
}
