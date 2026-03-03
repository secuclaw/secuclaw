import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";
import type { AppConfig, LoggingConfig } from "./types.js";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);
const logFormatSchema = z.enum(["json", "text"]);
const logOutputSchema = z.enum(["stdout", "file"]);

const compactionConfigSchema = z.object({
  enabled: z.boolean(),
  preserveLastN: z.number().int().positive(),
  summarizeOlder: z.boolean(),
});

const serverConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  wsPort: z.number().int().positive(),
  cors: z.object({
    origins: z.array(z.string()),
    credentials: z.boolean(),
  }),
});

const agentConfigSchema = z.object({
  defaultModel: z.string(),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  maxSteps: z.number().int().positive(),
  timeout: z.number().int().positive(),
});

const sessionConfigSchema = z.object({
  persistencePath: z.string(),
  compactionThreshold: z.number().int().positive(),
  maxMessages: z.number().int().positive(),
  compaction: compactionConfigSchema,
});

const memoryConfigSchema = z.object({
  vectorEnabled: z.boolean(),
  bm25Enabled: z.boolean(),
  decayFactor: z.number().min(0).max(1),
  diversityWeight: z.number().min(0).max(1),
  embeddingProvider: z.string(),
  embeddingModel: z.string(),
});

const schedulerConfigSchema = z.object({
  heartbeatEnabled: z.boolean(),
  heartbeatInterval: z.number().int().positive(),
  wakeMergeWindow: z.number().int().nonnegative(),
  maxConcurrentTasks: z.number().int().positive(),
});

const sandboxConfigSchema = z.object({
  enabled: z.boolean(),
  dockerImage: z.string(),
  timeout: z.number().int().positive(),
  memoryLimit: z.string(),
});

const loggingConfigSchema = z.object({
  level: logLevelSchema,
  format: logFormatSchema,
  output: z.array(logOutputSchema),
  filePath: z.string(),
});

const appConfigSchema = z.object({
  server: serverConfigSchema,
  agents: agentConfigSchema,
  session: sessionConfigSchema,
  memory: memoryConfigSchema,
  scheduler: schedulerConfigSchema,
  sandbox: sandboxConfigSchema,
  logging: loggingConfigSchema,
});

const defaultConfigPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../config");

export class ConfigLoader {
  private config: AppConfig | null = null;
  private configDir: string;

  constructor(configDir: string = defaultConfigPath) {
    this.configDir = configDir;
  }

  async load(configPath?: string): Promise<AppConfig> {
    const path = configPath ?? join(this.configDir, "default.yaml");
    const content = await readFile(path, "utf-8");
    const rawConfig = YAML.parse(content);
    this.config = appConfigSchema.parse(rawConfig);
    return this.config;
  }

  async loadRoles(): Promise<Record<string, unknown>> {
    return this.loadYamlFile("roles.yaml");
  }

  async loadTools(): Promise<Record<string, unknown>> {
    return this.loadYamlFile("tools.yaml");
  }

  async loadKnowledge(): Promise<Record<string, unknown>> {
    return this.loadYamlFile("knowledge.yaml");
  }

  private async loadYamlFile(filename: string): Promise<Record<string, unknown>> {
    const path = join(this.configDir, filename);
    const content = await readFile(path, "utf-8");
    return YAML.parse(content);
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call load() first.");
    }
    return this.config;
  }

  getLoggingConfig(): LoggingConfig {
    return this.getConfig().logging;
  }
}

export const configLoader = new ConfigLoader();
