import type { IMessageChannel } from "./trait.js";

export type ChannelFactory<TConfig> = (config: TConfig) => IMessageChannel;

export class ChannelFactoryRegistry<TConfig = Record<string, unknown>> {
  private readonly factories = new Map<string, ChannelFactory<TConfig>>();

  register(type: string, factory: ChannelFactory<TConfig>): void {
    this.factories.set(type, factory);
  }

  create(type: string, config: TConfig): IMessageChannel {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown channel factory: ${type}`);
    }
    return factory(config);
  }

  has(type: string): boolean {
    return this.factories.has(type);
  }
}

export function createChannel<TConfig>(
  type: string,
  config: TConfig,
  registry: ChannelFactoryRegistry<TConfig>,
): IMessageChannel {
  return registry.create(type, config);
}

export function createChannelFromConfig<TConfig extends { type: string }>(
  config: TConfig,
  registry: ChannelFactoryRegistry<TConfig>,
): IMessageChannel {
  return registry.create(config.type, config);
}
