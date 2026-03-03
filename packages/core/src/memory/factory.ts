import { MemoryManager } from "./manager.js";
import type { MemoryConfig } from "./config.js";
import type { IMemoryStore } from "./trait.js";

export function createMemoryStore(config: MemoryConfig): IMemoryStore {
  if (config.backend !== "in-memory") {
    throw new Error(`Backend not implemented in phase-3 scaffold: ${config.backend}`);
  }

  const manager = new MemoryManager({
    dataDir: config.dataDir ?? "./data/memory",
    maxEntries: config.maxEntries,
  });

  return manager as unknown as IMemoryStore;
}

export function createMemoryStoreFromConfig(config: MemoryConfig): IMemoryStore {
  return createMemoryStore(config);
}

export function autoDetectMemoryBackend(): MemoryConfig["backend"] {
  if (process.env.DATABASE_URL) {
    return "postgres";
  }
  return "in-memory";
}
