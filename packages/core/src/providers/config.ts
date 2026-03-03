import type { IProviderConfig } from "./trait.js";

export class ProviderConfigBuilder {
  private config: IProviderConfig = {};

  withApiKey(apiKey: string): this {
    this.config.apiKey = apiKey;
    return this;
  }

  withBaseUrl(baseUrl: string): this {
    this.config.baseUrl = baseUrl;
    return this;
  }

  withModel(model: string): this {
    this.config.model = model;
    return this;
  }

  withTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  withRetries(retries: number): this {
    this.config.retries = retries;
    return this;
  }

  withExtra(extra: Record<string, unknown>): this {
    this.config.extra = { ...(this.config.extra ?? {}), ...extra };
    return this;
  }

  build(): IProviderConfig {
    return { ...this.config };
  }
}

export function validateConfig(config: IProviderConfig): boolean {
  if (config.timeout !== undefined && config.timeout <= 0) {
    return false;
  }
  if (config.retries !== undefined && config.retries < 0) {
    return false;
  }
  return true;
}

export function mergeConfig(...parts: Array<Partial<IProviderConfig> | undefined>): IProviderConfig {
  return Object.assign({}, ...parts);
}

export function resolveSecret(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const envRef = /^\$\{(.+)\}$/.exec(value);
  if (!envRef) {
    return value;
  }

  return process.env[envRef[1]];
}
