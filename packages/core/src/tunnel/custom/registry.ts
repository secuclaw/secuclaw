import type { TunnelFactoryFn, TunnelOptions, TunnelType } from "./types.js";
import type { BaseTunnel } from "./base.js";

export class TunnelRegistry {
  private readonly factories = new Map<TunnelType, TunnelFactoryFn>();

  register(type: TunnelType, factory: TunnelFactoryFn): void {
    this.factories.set(type, factory);
  }

  get(type: TunnelType): TunnelFactoryFn | undefined {
    return this.factories.get(type);
  }

  list(): TunnelType[] {
    return Array.from(this.factories.keys());
  }

  create(type: TunnelType, options: TunnelOptions): BaseTunnel {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`tunnel type not registered: ${type}`);
    }
    return factory(options);
  }
}
