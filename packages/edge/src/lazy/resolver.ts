import type { ModuleMetadata, ResolverEntry } from "./types.js";

export class ModuleResolver {
  private readonly entries = new Map<string, ResolverEntry>();

  register(name: string, importer: ResolverEntry["importer"], metadata?: Partial<ModuleMetadata>): void {
    this.entries.set(name, {
      importer,
      metadata: {
        name,
        critical: metadata?.critical ?? false,
        warmup: metadata?.warmup ?? false,
        tags: metadata?.tags ?? [],
      },
    });
  }

  resolve(name: string): ResolverEntry {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`Module not registered: ${name}`);
    }
    return entry;
  }

  exists(name: string): boolean {
    return this.entries.has(name);
  }

  getMetadata(name: string): ModuleMetadata | undefined {
    return this.entries.get(name)?.metadata;
  }

  list(): string[] {
    return Array.from(this.entries.keys());
  }
}
