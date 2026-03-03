export type TunnelType = "ssh" | "ws";

export interface TunnelOptions {
  name: string;
  target: string;
  localPort?: number;
  remotePort?: number;
  host?: string;
  user?: string;
}

export interface TunnelStatus {
  connected: boolean;
  url?: string;
  startedAt?: number;
}

export type TunnelFactoryFn = (options: TunnelOptions) => BaseTunnel;

import type { BaseTunnel } from "./base.js";
