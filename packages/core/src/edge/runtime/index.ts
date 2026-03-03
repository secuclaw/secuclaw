/**
 * Edge Runtime - Lightweight runtime for edge deployment
 * Target: <20MB memory footprint
 */

import { EventEmitter } from "node:events";
import { DEFAULT_EDGE_CONFIG } from "../types.js";
import type {
  EdgeConfig,
  EdgeModule,
  EdgeStatus,
  EdgeEvent,
  EdgeEventHandler,
  EdgeEventType,
  MemoryStats,
} from "../types.js";
export class EdgeRuntime extends EventEmitter {
  private config: EdgeConfig;
  private modules: Map<string, EdgeModule> = new Map();
  private initialized = false;
  private startTime = 0;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private memoryWarningThreshold: number;
  private memoryCriticalThreshold: number;

  constructor(config: Partial<EdgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_EDGE_CONFIG, ...config };
    this.memoryWarningThreshold = this.config.maxMemoryMB * 0.8;
    this.memoryCriticalThreshold = this.config.maxMemoryMB * 0.95;
  }

  /**
   * Initialize the edge runtime
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.startTime = Date.now();

    // Preload required modules
    for (const moduleName of this.config.preloadModules) {
      await this.loadModule(moduleName);
    }

    // Start health check timer
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckTimer = setInterval(
        () => this.checkHealth(),
        this.config.healthCheckInterval
      );
    }

    this.initialized = true;
    this.emitEvent("initialized", { config: this.config });
  }

  /**
   * Shutdown the edge runtime
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Unload all modules
    for (const [name, module] of this.modules) {
      if (module.unload) {
        try {
          await module.unload();
        } catch {
          // Ignore unload errors
        }
      }
    }

    this.modules.clear();
    this.initialized = false;
  }

  /**
   * Register a module
   */
  registerModule(module: EdgeModule): void {
    this.modules.set(module.name, module);
  }

  /**
   * Load a module by name
   */
  async loadModule(name: string): Promise<unknown> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not found: ${name}`);
    }

    if (module.loaded) {
      return module;
    }

    // Check memory before loading
    const memory = this.getMemoryStats();
    const projectedMemory = memory.heapUsed + module.size;
    const projectedMB = projectedMemory / (1024 * 1024);

    if (projectedMB > this.memoryCriticalThreshold) {
      throw new Error(
        `Loading module ${name} would exceed memory limit (${projectedMB.toFixed(2)}MB > ${this.memoryCriticalThreshold}MB)`
      );
    }

    if (projectedMB > this.memoryWarningThreshold) {
      this.emitEvent("memory_warning", {
        current: memory.usagePercent,
        projected: projectedMB,
      });
    }

    const result = await module.load();
    module.loaded = true;

    this.emitEvent("module_loaded", { name, size: module.size });
    return result;
  }

  /**
   * Unload a module by name
   */
  async unloadModule(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      return;
    }

    if (module.unload) {
      await module.unload();
    }

    module.loaded = false;
    this.emitEvent("module_unloaded", { name });
  }

  /**
   * Get current memory stats
   */
  getMemoryStats(): MemoryStats {
    const mem = process.memoryUsage();
    const usagePercent = (mem.heapUsed / mem.heapTotal) * 100;

    return {
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss,
      usagePercent,
    };
  }

  /**
   * Get runtime status
   */
  getStatus(): EdgeStatus {
    return {
      initialized: this.initialized,
      memory: this.getMemoryStats(),
      loadedModules: Array.from(this.modules.values())
        .filter((m) => m.loaded)
        .map((m) => m.name),
      uptime: Date.now() - this.startTime,
      healthy: this.isHealthy(),
      lastHealthCheck: Date.now(),
    };
  }

  /**
   * Check if runtime is healthy
   */
  isHealthy(): boolean {
    const memory = this.getMemoryStats();
    const usedMB = memory.heapUsed / (1024 * 1024);
    return usedMB < this.memoryCriticalThreshold && this.initialized;
  }

  /**
   * Perform health check
   */
  private checkHealth(): void {
    const memory = this.getMemoryStats();
    const usedMB = memory.heapUsed / (1024 * 1024);

    if (usedMB > this.memoryCriticalThreshold) {
      this.emitEvent("memory_critical", { usedMB, limit: this.config.maxMemoryMB });
    } else if (usedMB > this.memoryWarningThreshold) {
      this.emitEvent("memory_warning", { usedMB, limit: this.config.maxMemoryMB });
    }

    this.emitEvent("health_check", {
      healthy: this.isHealthy(),
      memory: memory,
    });
  }

  /**
   * Emit an edge event
   */
  private emitEvent(type: EdgeEventType, data?: unknown): void {
    const event: EdgeEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit("event", event);
    this.emit(type, event);
  }

  /**
   * Subscribe to events
   */
  onEvent(handler: EdgeEventHandler): () => void {
    this.on("event", handler);
    return () => this.off("event", handler);
  }
}

/**
 * Create edge runtime instance
 */
export function createEdgeRuntime(config?: Partial<EdgeConfig>): EdgeRuntime {
  return new EdgeRuntime(config);
}
