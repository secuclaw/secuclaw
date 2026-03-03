export interface TailscaleStatus {
  connected: boolean;
  backendState?: string;
  health?: string[];
  raw?: unknown;
}

export interface TailscaleServeEntry {
  name: string;
  source: string;
  target: string;
}

export interface TailscaleFunnelStatus {
  enabled: boolean;
  target?: string;
}
