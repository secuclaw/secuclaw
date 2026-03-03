import { TunnelRegistry } from "./registry.js";
import { SSHTunnel } from "./ssh.js";
import { WebSocketTunnel } from "./ws.js";
import type { BaseTunnel } from "./base.js";
import type { TunnelOptions, TunnelType } from "./types.js";

export class TunnelFactory {
  private readonly registry = new TunnelRegistry();

  constructor() {
    this.register("ssh", (options) => new SSHTunnel(options));
    this.register("ws", (options) => new WebSocketTunnel(options));
  }

  register(type: TunnelType, factory: (options: TunnelOptions) => BaseTunnel): void {
    this.registry.register(type, factory);
  }

  create(type: TunnelType, options: TunnelOptions): BaseTunnel {
    return this.registry.create(type, options);
  }

  listTypes(): TunnelType[] {
    return this.registry.list();
  }
}
