/**
 * Hand Framework - Base Hand Class
 * 
 * Abstract base class that all Hand implementations must extend.
 */

import type {
  HandDefinition,
} from "./types.js";
import type {
  HandContext,
  Logger,
  Storage,
  MemoryStore,
  ToolRegistry,
  ToolDefinition,
} from "./context.js";
import type { HandResult } from "./result.js";
import type { HandState } from "./state.js";
import { RequirementChecker, type RequirementCheckResult } from "./requirements.js";

// Callback types
export type ProgressCallback = (progress: number, message: string) => void;
export type ErrorCallback = (error: Error) => void | Promise<void>;

// Default context implementations
export interface DefaultLogger extends Logger {
  constructorDefault?: boolean;
}

class DefaultLoggerImpl implements Logger {
  constructor(private prefix: string = "") {}

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[${this.prefix}] DEBUG:`, message, meta ?? "");
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[${this.prefix}] INFO:`, message, meta ?? "");
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${this.prefix}] WARN:`, message, meta ?? "");
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[${this.prefix}] ERROR:`, message, meta ?? "");
  }
}

class DefaultStorage implements Storage {
  private store = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async list(prefix?: string): Promise<string[]> {
    if (!prefix) {
      return Array.from(this.store.keys());
    }
    return Array.from(this.store.keys()).filter((k) => k.startsWith(prefix));
  }
}

class DefaultMemoryStore implements MemoryStore {
  private store = new Map<string, unknown>();

  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T = unknown>(key: string, value: T): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

class DefaultToolRegistry implements ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(name: string, _args: Record<string, unknown>): Promise<unknown> {
    throw new Error(`Tool '${name}' not found`);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
}

// Export default context factories
export function createDefaultLogger(prefix: string): Logger {
  return new DefaultLoggerImpl(prefix);
}

export function createDefaultStorage(): Storage {
  return new DefaultStorage();
}

export function createDefaultMemoryStore(): MemoryStore {
  return new DefaultMemoryStore();
}

export function createDefaultToolRegistry(): ToolRegistry & { register(tool: ToolDefinition): void } {
  return new DefaultToolRegistry() as ToolRegistry & { register(tool: ToolDefinition): void };
}

// Abstract base Hand class
export abstract class BaseHand {
  // Class-level definition - must be set by subclasses
  protected static definition: HandDefinition;

  // Instance state
  protected definitionInstance: HandDefinition;
  protected state: HandState;
  protected context: HandContext | null = null;

  // Event callbacks
  protected progressCallbacks = new Set<ProgressCallback>();
  protected errorCallbacks = new Set<ErrorCallback>();

  // Terminate flag for graceful shutdown
  protected terminated = false;

  constructor(definition: HandDefinition) {
    this.definitionInstance = definition;
    this.state = {
      instanceId: "",
      status: "idle",
      progress: 0,
      runCount: 0,
      successCount: 0,
      errorCount: 0,
      metadata: {},
    };
  }

  // ============ Lifecycle (must implement) ============

  /**
   * Initialize the Hand - called once before first execution
   */
  abstract initialize(): Promise<void>;

  /**
   * Execute the Hand's main logic
   */
  abstract execute(context: HandContext): Promise<HandResult>;

  /**
   * Terminate the Hand - called for graceful shutdown
   */
  abstract terminate(): Promise<void>;

  // ============ Static Methods ============

  /**
   * Get the Hand definition
   */
  static getDefinition(): HandDefinition {
    return this.definition;
  }

  /**
   * Check all requirements for this Hand
   */
  static async checkRequirements(): Promise<RequirementCheckResult[]> {
    const def = this.definition;
    if (!def || !def.requirements) {
      return [];
    }
    return RequirementChecker.checkAll(def.requirements);
  }

  // ============ State Management ============

  /**
   * Get current state
   */
  getState(): HandState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  setState(state: Partial<HandState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * Persist state to storage
   */
  async persistState(): Promise<void> {
    if (this.context?.storage) {
      await this.context.storage.set(`hand_state_${this.state.instanceId}`, this.state);
    }
  }

  /**
   * Set instance ID
   */
  setInstanceId(instanceId: string): void {
    this.state.instanceId = instanceId;
  }

  // ============ Progress Reporting ============

  /**
   * Register a progress callback
   * @returns Unsubscribe function
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Report progress
   */
  reportProgress(progress: number, message: string): void {
    this.state.progress = progress;
    this.progressCallbacks.forEach((cb) => {
      try {
        cb(progress, message);
      } catch {
        // Ignore callback errors
      }
    });
  }

  // ============ Error Handling ============

  /**
   * Register an error callback
   * @returns Unsubscribe function
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Handle an error
   */
  async handleError(error: Error): Promise<void> {
    this.state.lastError = error;
    this.state.errorCount++;
    this.state.status = "error";

    const errors = this.errorCallbacks;
    await Promise.all(
      Array.from(errors).map((cb) => {
        try {
          return cb(error);
        } catch {
          // Ignore callback errors
        }
      })
    );
  }

  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(fn: () => Promise<T>, attempts: number, baseDelayMs: number = 1000): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (i < attempts - 1) {
          const delay = baseDelayMs * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error("Retry failed");
  }

  // ============ Metrics ============

  /**
   * Get metrics for this Hand
   */
  getMetrics(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {
      runCount: this.state.runCount,
      successCount: this.state.successCount,
      errorCount: this.state.errorCount,
      successRate: this.state.runCount > 0 
        ? (this.state.successCount / this.state.runCount) * 100 
        : 0,
    };

    // Add custom metrics from definition
    if (this.context?.memory) {
      for (const metric of this.definitionInstance.metrics) {
        const value = this.context.memory.get(metric.memoryKey);
        if (value !== undefined) {
          metrics[metric.memoryKey] = value;
        }
      }
    }

    return metrics;
  }

  /**
   * Report a metric
   */
  protected reportMetric(key: string, value: unknown): void {
    if (this.context) {
      this.context.reportMetric(key, value);
    }
  }

  // ============ Context Management ============

  /**
   * Create execution context
   */
  public createContext(options: {
    instanceId: string;
    scheduledTime?: Date;
    timeout?: number;
    maxRetries?: number;
    config?: Record<string, unknown>;
    logger?: Logger;
    storage?: Storage;
    memory?: MemoryStore;
    tools?: ToolRegistry;
  }): HandContext {
    const instanceId = options.instanceId;
    const scheduledTime = options.scheduledTime ?? new Date();
    const timeout = options.timeout ?? 300000; // 5 minutes default
    const maxRetries = options.maxRetries ?? 3;
    const config = options.config ?? {};
    const logger = options.logger ?? createDefaultLogger(this.definitionInstance.name);
    const storage = options.storage ?? createDefaultStorage();
    const memory = options.memory ?? createDefaultMemoryStore();
    const tools = options.tools ?? createDefaultToolRegistry();

    this.context = {
      instanceId,
      scheduledTime,
      timeout,
      maxRetries,
      config,
      logger,
      storage,
      memory,
      tools,
      reportProgress: (progress: number, message: string) => {
        this.reportProgress(progress, message);
      },
      reportMetric: (key: string, value: unknown) => {
        this.reportMetric(key, value);
      },
      emitEvent: (event: string, data: unknown) => {
        this.context?.logger.debug(`Event: ${event}`, { data });
      },
    };

    return this.context;
  }

  // ============ Lifecycle Helpers ============

  /**
   * Check if terminated
   */
  isTerminated(): boolean {
    return this.terminated;
  }

  /**
   * Mark as terminated
   */
  protected markTerminated(): void {
    this.terminated = true;
    this.state.status = "completed";
  }
}
