import type { BaseChannel } from "./base.js";
import type { ChannelConfig } from "./types.js";
import type { IMessageChannel } from "./trait.js";

export type ChannelFactory = (config: ChannelConfig) => BaseChannel;

export class ChannelRegistry {
  private readonly channels = new Map<string, IMessageChannel>();
  private readonly factories = new Map<string, ChannelFactory>();

  // Legacy registry APIs (trait-based channel registry)
  register(channel: IMessageChannel): void {
    this.channels.set(channel.id, channel);
  }

  get(id: string): IMessageChannel | undefined {
    return this.channels.get(id);
  }

  list(): IMessageChannel[] {
    return Array.from(this.channels.values());
  }

  getByCapability(capability: keyof IMessageChannel["capabilities"]): IMessageChannel[] {
    return this.list().filter((channel) => Boolean(channel.capabilities[capability]));
  }

  // New factory APIs for dynamic channel instantiation
  registerFactory(type: string, factory: ChannelFactory): void {
    this.factories.set(type, factory);
  }

  unregisterFactory(type: string): void {
    this.factories.delete(type);
  }

  create(type: string, config: ChannelConfig): BaseChannel {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown channel factory type: ${type}`);
    }
    return factory(config);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  getFactory(type: string): ChannelFactory | undefined {
    return this.factories.get(type);
  }
}
