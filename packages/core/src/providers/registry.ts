import type { ILLMProvider } from "./trait.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, ILLMProvider>();

  register(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  getById(id: string): ILLMProvider | undefined {
    return this.get(id);
  }

  list(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  getByCapability(capability: keyof ILLMProvider["capabilities"]): ILLMProvider[] {
    return this.list().filter((provider) => Boolean(provider.capabilities[capability]));
  }
}
