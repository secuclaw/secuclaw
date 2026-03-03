import type { AppConfig } from "./types.js";
import { ConfigValidator } from "./validator.js";
import { ConfigRollback } from "./rollback.js";

export type ConfigApplyCallback = (config: AppConfig) => Promise<void> | void;

export class HotReloader {
  private readonly validator: ConfigValidator;
  private readonly rollback: ConfigRollback;
  private readonly listeners = new Set<ConfigApplyCallback>();

  constructor(
    validator: ConfigValidator = new ConfigValidator(),
    rollback: ConfigRollback = new ConfigRollback(),
  ) {
    this.validator = validator;
    this.rollback = rollback;
  }

  async reload(current: AppConfig, incoming: AppConfig): Promise<AppConfig> {
    this.rollback.save(current as unknown as Record<string, unknown>);

    if (!this.validator.validate(incoming)) {
      throw new Error(`config validation failed: ${JSON.stringify(this.validator.getErrors())}`);
    }

    await this.apply(incoming);
    this.notify(incoming);
    return incoming;
  }

  async apply(config: AppConfig): Promise<void> {
    for (const listener of this.listeners) {
      await listener(config);
    }
  }

  notify(config: AppConfig): void {
    for (const listener of this.listeners) {
      void listener(config);
    }
  }

  onApply(callback: ConfigApplyCallback): void {
    this.listeners.add(callback);
  }

  rollbackLast(): AppConfig {
    return this.rollback.rollback() as unknown as AppConfig;
  }
}
