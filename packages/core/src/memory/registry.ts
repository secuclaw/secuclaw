import type { IMemoryStore } from "./trait.js";

export class MemoryRegistry {
  private readonly stores = new Map<string, IMemoryStore>();

  register(store: IMemoryStore): void {
    this.stores.set(store.id, store);
  }

  get(id: string): IMemoryStore | undefined {
    return this.stores.get(id);
  }

  list(): IMemoryStore[] {
    return Array.from(this.stores.values());
  }

  getByCapability(capability: keyof IMemoryStore["capabilities"]): IMemoryStore[] {
    return this.list().filter((store) => Boolean(store.capabilities[capability]));
  }
}
