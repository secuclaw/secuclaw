export interface CloudflareStatus {
  connected: boolean;
  tunnelId?: string;
  endpoint?: string;
  startedAt?: number;
}

export interface CloudflareConnectorOptions {
  tunnelId: string;
  credentialsFile: string;
  configFile?: string;
}
