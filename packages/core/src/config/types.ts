export interface ServerConfig {
  host: string;
  port: number;
  wsPort: number;
  cors: {
    origins: string[];
    credentials: boolean;
  };
}

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AgentConfig {
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  maxSteps: number;
  timeout: number;
}

export interface CompactionConfig {
  enabled: boolean;
  preserveLastN: number;
  summarizeOlder: boolean;
}

export interface SessionConfig {
  persistencePath: string;
  compactionThreshold: number;
  maxMessages: number;
  compaction: CompactionConfig;
}

export interface MemoryConfig {
  vectorEnabled: boolean;
  bm25Enabled: boolean;
  decayFactor: number;
  diversityWeight: number;
  embeddingProvider: string;
  embeddingModel: string;
}

export interface SchedulerConfig {
  heartbeatEnabled: boolean;
  heartbeatInterval: number;
  wakeMergeWindow: number;
  maxConcurrentTasks: number;
}

export interface SandboxConfig {
  enabled: boolean;
  dockerImage: string;
  timeout: number;
  memoryLimit: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "json" | "text";
export type LogOutput = "stdout" | "file";

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  output: LogOutput[];
  filePath: string;
}

export interface AppConfig {
  server: ServerConfig;
  agents: AgentConfig;
  session: SessionConfig;
  memory: MemoryConfig;
  scheduler: SchedulerConfig;
  sandbox: SandboxConfig;
  logging: LoggingConfig;
}

export interface ConfigHotReloadOptions {
  enabled: boolean;
  watchPaths: string[];
  debounceMs: number;
}

export interface ConfigVersionedPayload {
  version: string;
  payload: Record<string, unknown>;
}
