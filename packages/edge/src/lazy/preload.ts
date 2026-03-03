import { ModuleResolver } from "./resolver.js";

export class PreloadStrategy {
  private readonly hitCounter = new Map<string, number>();

  markAccess(moduleName: string): void {
    const current = this.hitCounter.get(moduleName) ?? 0;
    this.hitCounter.set(moduleName, current + 1);
  }

  predict(limit: number = 3): string[] {
    return Array.from(this.hitCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
  }

  schedule(modules: string[]): string[] {
    return [...new Set(modules)];
  }

  async execute(modules: string[], loader: (name: string) => Promise<unknown>): Promise<void> {
    await Promise.all(modules.map((m) => loader(m).catch(() => undefined)));
  }

  warmupCandidates(resolver: ModuleResolver): string[] {
    return resolver
      .list()
      .filter((name) => resolver.getMetadata(name)?.warmup ?? false);
  }
}
