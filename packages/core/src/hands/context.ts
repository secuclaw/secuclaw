/**
 * Hand Framework - Execution Context
 * 
 * Defines the runtime context passed to Hand implementations during execution.
 */

// Logger interface for Hand operations
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// Storage interface for persistent data
export interface Storage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

// Memory store interface for runtime data
export interface MemoryStore {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
}

// Tool definition
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// Tool registry interface
export interface ToolRegistry {
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  has(name: string): boolean;
  execute(name: string, args: Record<string, unknown>): Promise<unknown>;
}

// Progress reporter callback
export type ProgressReporter = (progress: number, message: string) => void;

// Metric reporter callback
export type MetricReporter = (key: string, value: unknown) => void;

// Event emitter callback
export type EventEmitter = (event: string, data: unknown) => void;

// Execution context passed to Hand implementations
export interface HandContext {
  instanceId: string;
  scheduledTime: Date;
  timeout: number;
  maxRetries: number;
  config: Record<string, unknown>;
  logger: Logger;
  storage: Storage;
  memory: MemoryStore;
  tools: ToolRegistry;
  reportProgress: ProgressReporter;
  reportMetric: MetricReporter;
  emitEvent: EventEmitter;
}
