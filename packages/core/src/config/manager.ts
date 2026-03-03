import * as fs from "node:fs";
import * as path from "node:path";
import type { AppConfig } from "./types.js";

export interface ConfigValue {
  key: string;
  value: unknown;
  source: "default" | "file" | "env" | "runtime";
  updatedAt: Date;
}

export interface ConfigAuditEntry {
  timestamp: Date;
  action: "get" | "set" | "delete";
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  source: string;
}

const DEFAULT_CONFIG: AppConfig = {
  server: {
    host: "0.0.0.0",
    port: 3000,
    wsPort: 3001,
    cors: {
      origins: ["*"],
      credentials: true,
    },
  },
  agents: {
    defaultModel: "zhipu",
    maxTokens: 4096,
    temperature: 0.7,
    maxSteps: 20,
    timeout: 60000,
  },
  session: {
    persistencePath: "./data/sessions",
    compactionThreshold: 100,
    maxMessages: 1000,
    compaction: {
      enabled: true,
      preserveLastN: 20,
      summarizeOlder: true,
    },
  },
  memory: {
    vectorEnabled: true,
    bm25Enabled: true,
    decayFactor: 0.95,
    diversityWeight: 0.3,
    embeddingProvider: "local",
    embeddingModel: "all-MiniLM-L6-v2",
  },
  scheduler: {
    heartbeatEnabled: true,
    heartbeatInterval: 60000,
    wakeMergeWindow: 5000,
    maxConcurrentTasks: 5,
  },
  sandbox: {
    enabled: true,
    dockerImage: "esc-sandbox:latest",
    timeout: 300000,
    memoryLimit: "512m",
  },
  logging: {
    level: "info",
    format: "json",
    output: ["stdout"],
    filePath: "./logs/esc.log",
  },
};

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: Map<string, ConfigValue> = new Map();
  private auditLog: ConfigAuditEntry[] = [];
  private auditEnabled: boolean = true;

  constructor(configDir: string) {
    this.configDir = configDir;
    this.configFile = path.join(configDir, "esc-config.json");
    this.loadDefaults();
  }

  private loadDefaults(): void {
    this.flattenConfig(DEFAULT_CONFIG as unknown as Record<string, unknown>, "default");
  }

  private flattenConfig(obj: Record<string, unknown>, prefix: string, source: ConfigValue["source"] = "default"): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        this.flattenConfig(value as Record<string, unknown>, fullKey, source);
      } else {
        this.config.set(fullKey, {
          key: fullKey,
          value,
          source,
          updatedAt: new Date(),
        });
      }
    }
  }

  async load(): Promise<void> {
    // Load from config file
    if (fs.existsSync(this.configFile)) {
      try {
        const content = fs.readFileSync(this.configFile, "utf-8");
        const fileConfig = JSON.parse(content);
        this.flattenConfig(fileConfig, "", "file");
      } catch (err) {
        console.error(`Failed to load config file: ${this.configFile}`, err);
      }
    }

    // Load from environment variables (ESC_ prefix)
    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (envKey.startsWith("ESC_") && envValue !== undefined) {
        const configKey = envKey
          .slice(4)
          .toLowerCase()
          .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        
        let parsedValue: unknown = envValue;
        // Try to parse as JSON for complex values
        try {
          parsedValue = JSON.parse(envValue);
        } catch {
          // Keep as string
        }

        this.config.set(configKey, {
          key: configKey,
          value: parsedValue,
          source: "env",
          updatedAt: new Date(),
        });
      }
    }
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.config.get(key);
    if (entry && this.auditEnabled) {
      this.auditLog.push({
        timestamp: new Date(),
        action: "get",
        key,
        source: "api",
      });
    }
    return entry?.value as T | undefined;
  }

  getWithDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  async set(key: string, value: unknown): Promise<void> {
    const oldValue = this.config.get(key)?.value;
    
    this.config.set(key, {
      key,
      value,
      source: "runtime",
      updatedAt: new Date(),
    });

    if (this.auditEnabled) {
      this.auditLog.push({
        timestamp: new Date(),
        action: "set",
        key,
        oldValue,
        newValue: value,
        source: "api",
      });
    }

    // Persist to file
    await this.persist();
  }

  async delete(key: string): Promise<boolean> {
    const oldValue = this.config.get(key)?.value;
    const deleted = this.config.delete(key);

    if (deleted && this.auditEnabled) {
      this.auditLog.push({
        timestamp: new Date(),
        action: "delete",
        key,
        oldValue,
        source: "api",
      });
    }

    if (deleted) {
      await this.persist();
    }

    return deleted;
  }

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of this.config) {
      result[key] = entry.value;
    }
    return result;
  }

  getEntries(): ConfigValue[] {
    return Array.from(this.config.values());
  }

  getBySource(source: ConfigValue["source"]): ConfigValue[] {
    return this.getEntries().filter((e) => e.source === source);
  }

  getAuditLog(limit = 100): ConfigAuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  setAuditEnabled(enabled: boolean): void {
    this.auditEnabled = enabled;
  }

  private async persist(): Promise<void> {
    // Build nested config object from flat keys
    const configObj: Record<string, unknown> = {};
    
    for (const [key, entry] of this.config) {
      if (entry.source === "runtime" || entry.source === "file") {
        this.setNestedValue(configObj, key, entry.value);
      }
    }

    // Ensure directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Write config file
    fs.writeFileSync(this.configFile, JSON.stringify(configObj, null, 2));
  }

  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    const parts = key.split(".");
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    
    current[parts[parts.length - 1]] = value;
  }

  exportToFile(filePath: string): void {
    const exportData = {
      config: this.getAll(),
      auditLog: this.auditLog,
      exportedAt: new Date(),
    };
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  }

  importFromFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const importData = JSON.parse(content);
    
    if (importData.config) {
      this.flattenConfig(importData.config, "", "file");
    }
  }

  // Typed getters for common config sections
  getServerConfig() {
    return {
      host: this.getWithDefault("server.host", DEFAULT_CONFIG.server.host),
      port: this.getWithDefault("server.port", DEFAULT_CONFIG.server.port),
      wsPort: this.getWithDefault("server.wsPort", DEFAULT_CONFIG.server.wsPort),
      cors: this.getWithDefault("server.cors", DEFAULT_CONFIG.server.cors),
    };
  }

  getAgentConfig() {
    return {
      defaultModel: this.getWithDefault("agents.defaultModel", DEFAULT_CONFIG.agents.defaultModel),
      maxTokens: this.getWithDefault("agents.maxTokens", DEFAULT_CONFIG.agents.maxTokens),
      temperature: this.getWithDefault("agents.temperature", DEFAULT_CONFIG.agents.temperature),
      maxSteps: this.getWithDefault("agents.maxSteps", DEFAULT_CONFIG.agents.maxSteps),
      timeout: this.getWithDefault("agents.timeout", DEFAULT_CONFIG.agents.timeout),
    };
  }

  getSandboxConfig() {
    return {
      enabled: this.getWithDefault("sandbox.enabled", DEFAULT_CONFIG.sandbox.enabled),
      dockerImage: this.getWithDefault("sandbox.dockerImage", DEFAULT_CONFIG.sandbox.dockerImage),
      timeout: this.getWithDefault("sandbox.timeout", DEFAULT_CONFIG.sandbox.timeout),
      memoryLimit: this.getWithDefault("sandbox.memoryLimit", DEFAULT_CONFIG.sandbox.memoryLimit),
    };
  }

  getLoggingConfig() {
    return {
      level: this.getWithDefault("logging.level", DEFAULT_CONFIG.logging.level),
      format: this.getWithDefault("logging.format", DEFAULT_CONFIG.logging.format),
      output: this.getWithDefault("logging.output", DEFAULT_CONFIG.logging.output),
      filePath: this.getWithDefault("logging.filePath", DEFAULT_CONFIG.logging.filePath),
    };
  }
}
