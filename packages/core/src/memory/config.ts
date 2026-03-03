export type MemoryBackend = "in-memory" | "sqlite" | "postgres" | "markdown";

export interface MemoryConfig {
  backend: MemoryBackend;
  maxEntries: number;
  maxStorageMb: number;
  connectionString?: string;
  dataDir?: string;
}

export class MemoryConfigBuilder {
  private config: MemoryConfig = {
    backend: "in-memory",
    maxEntries: 10_000,
    maxStorageMb: 256,
  };

  withBackend(backend: MemoryBackend): this {
    this.config.backend = backend;
    return this;
  }

  withMaxEntries(maxEntries: number): this {
    this.config.maxEntries = maxEntries;
    return this;
  }

  withMaxStorageMb(maxStorageMb: number): this {
    this.config.maxStorageMb = maxStorageMb;
    return this;
  }

  withConnectionString(connectionString: string): this {
    this.config.connectionString = connectionString;
    return this;
  }

  withDataDir(dataDir: string): this {
    this.config.dataDir = dataDir;
    return this;
  }

  build(): MemoryConfig {
    return { ...this.config };
  }
}

export function validateConfig(config: MemoryConfig): boolean {
  if (config.maxEntries <= 0) {
    return false;
  }
  if (config.maxStorageMb <= 0) {
    return false;
  }
  return true;
}
