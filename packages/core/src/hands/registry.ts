/**
 * Hand Framework - Registry
 * 
 * Registry for managing Hand definitions and instances.
 */

import type {
  HandDefinition,
  HandInstance,
  HandStatus,
} from "./types.js";
import type { BaseHand } from "./base.js";
import type { HandContext, Logger, Storage, MemoryStore, ToolRegistry } from "./context.js";
import type { HandResult } from "./result.js";
import { HandStateManager, type HandState } from "./state.js";
import { createDefaultLogger, createDefaultStorage, createDefaultMemoryStore, createDefaultToolRegistry } from "./base.js";

// Hand class constructor type
export type HandConstructor<T extends BaseHand = BaseHand> = new (definition: HandDefinition) => T;

// Registry events
export type RegistryEvent =
  | { type: "hand_registered"; handId: string }
  | { type: "hand_activated"; instanceId: string; handId: string }
  | { type: "hand_paused"; instanceId: string }
  | { type: "hand_resumed"; instanceId: string }
  | { type: "hand_terminated"; instanceId: string }
  | { type: "hand_error"; instanceId: string; error: Error }
  | { type: "hand_completed"; instanceId: string; result: HandResult };

// Registry options
export interface HandRegistryOptions {
  logger?: Logger;
  storage?: Storage;
  stateManager?: HandStateManager;
}

// Active Hand instance with metadata
interface ActiveHand {
  instance: BaseHand;
  definition: HandDefinition;
  instanceId: string;
  handId: string;
  status: HandStatus;
  config: Record<string, unknown>;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  progress: number;
  error?: Error;
  stateManager: HandStateManager;
}

// Hand registry class
export class HandRegistry {
  private definitions = new Map<string, HandDefinition>();
  private handClasses = new Map<string, HandConstructor>();
  private activeInstances = new Map<string, ActiveHand>();
  private logger: Logger;
  private storage: Storage;
  private stateManager: HandStateManager;
  private eventListeners = new Map<string, Set<(event: RegistryEvent) => void>>();

  constructor(options: HandRegistryOptions = {}) {
    this.logger = options.logger ?? createDefaultLogger("HandRegistry");
    this.storage = options.storage ?? createDefaultStorage();
    this.stateManager = options.stateManager ?? new HandStateManager();
  }

  // ============ Definition Management ============

  /**
   * Register a Hand definition
   */
  register(definition: HandDefinition): void {
    if (this.definitions.has(definition.id)) {
      this.logger.warn(`Hand '${definition.id}' already registered, overwriting`);
    }
    this.definitions.set(definition.id, definition);
    this.emit({ type: "hand_registered", handId: definition.id });
    this.logger.info(`Registered Hand: ${definition.id} (${definition.name})`);
  }

  /**
   * Register a Hand class (for dynamic instantiation)
   */
  registerClass(handId: string, constructor: HandConstructor): void {
    this.handClasses.set(handId, constructor);
  }

  /**
   * Get a Hand definition
   */
  getDefinition(handId: string): HandDefinition | undefined {
    return this.definitions.get(handId);
  }

  /**
   * List all registered Hand definitions
   */
  listDefinitions(): HandDefinition[] {
    return Array.from(this.definitions.values());
  }

  // ============ Instance Management ============

  /**
   * Activate a Hand instance
   */
  async activate(handId: string, config: Record<string, unknown> = {}): Promise<HandInstance> {
    const definition = this.definitions.get(handId);
    if (!definition) {
      throw new Error(`Hand definition '${handId}' not found`);
    }

    const handClass = this.handClasses.get(handId);
    if (!handClass) {
      throw new Error(`Hand class '${handId}' not registered`);
    }

    const instanceId = this.generateInstanceId(handId);
    
    // Create the Hand instance
    const hand = new handClass(definition);
    hand.setInstanceId(instanceId);

    // Create state manager for this instance
    const instanceStateManager = new HandStateManager();
    instanceStateManager.setState(instanceId, {
      instanceId,
      status: "initializing",
      progress: 0,
      runCount: 0,
      successCount: 0,
      errorCount: 0,
      metadata: {},
    });

    // Store active instance
    const activeHand: ActiveHand = {
      instance: hand,
      definition,
      instanceId,
      handId,
      status: "initializing",
      config,
      createdAt: new Date(),
      progress: 0,
      stateManager: instanceStateManager,
    };

    this.activeInstances.set(instanceId, activeHand);

    // Initialize the Hand
    try {
      hand.setState({ status: "initializing" });
      await hand.initialize();
      hand.setState({ status: "idle" });
      activeHand.status = "idle";
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      hand.setState({ status: "error", lastError: err });
      activeHand.status = "error";
      activeHand.error = err;
      this.emit({ type: "hand_error", instanceId, error: err });
      throw err;
    }

    this.emit({ type: "hand_activated", instanceId, handId });

    return this.toHandInstance(activeHand);
  }

  /**
   * Pause a Hand instance
   */
  async pause(instanceId: string): Promise<void> {
    const activeHand = this.activeInstances.get(instanceId);
    if (!activeHand) {
      throw new Error(`Hand instance '${instanceId}' not found`);
    }

    activeHand.instance.setState({ status: "paused" });
    activeHand.status = "paused";
    await activeHand.stateManager.persistState(instanceId);
    
    this.emit({ type: "hand_paused", instanceId });
    this.logger.info(`Paused Hand instance: ${instanceId}`);
  }

  /**
   * Resume a paused Hand instance
   */
  async resume(instanceId: string): Promise<void> {
    const activeHand = this.activeInstances.get(instanceId);
    if (!activeHand) {
      throw new Error(`Hand instance '${instanceId}' not found`);
    }

    if (activeHand.status !== "paused") {
      throw new Error(`Hand instance '${instanceId}' is not paused`);
    }

    activeHand.instance.setState({ status: "idle" });
    activeHand.status = "idle";
    
    this.emit({ type: "hand_resumed", instanceId });
    this.logger.info(`Resumed Hand instance: ${instanceId}`);
  }

  /**
   * Execute a Hand instance
   */
  async execute(instanceId: string, contextOverrides?: Partial<HandContext>): Promise<HandResult> {
    const activeHand = this.activeInstances.get(instanceId);
    if (!activeHand) {
      throw new Error(`Hand instance '${instanceId}' not found`);
    }

    const { instance, definition } = activeHand;
    
    // Check if can execute
    if (activeHand.status === "active") {
      throw new Error(`Hand instance '${instanceId}' is already executing`);
    }

    // Update status
    activeHand.status = "active";
    activeHand.lastRun = new Date();
    instance.setState({ status: "active", lastRun: activeHand.lastRun });

    // Create execution context
    const context = instance.createContext({
      instanceId,
      config: { ...definition.settings.reduce((acc, s) => ({ ...acc, [s.key]: s.default }), {}), ...activeHand.config, ...contextOverrides?.config },
      logger: contextOverrides?.logger ?? this.logger,
      storage: contextOverrides?.storage ?? this.storage,
      memory: contextOverrides?.memory ?? createDefaultMemoryStore(),
      tools: contextOverrides?.tools ?? createDefaultToolRegistry(),
    });

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Execution timeout")), context.timeout);
    });

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([instance.execute(context), timeoutPromise]);
      const duration = Date.now() - startTime;

      // Update state
      instance.setState({
        status: "completed",
        progress: 100,
        runCount: instance.getState().runCount + 1,
        successCount: instance.getState().successCount + 1,
      });
      
      activeHand.progress = 100;
      activeHand.status = "completed";

      this.emit({ type: "hand_completed", instanceId, result: { ...result, duration } });
      this.logger.info(`Hand '${instanceId}' completed in ${duration}ms`);

      return { ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Update state
      instance.setState({
        status: "error",
        lastError: err,
        errorCount: instance.getState().errorCount + 1,
        runCount: instance.getState().runCount + 1,
      });
      
      activeHand.status = "error";
      activeHand.error = err;

      this.emit({ type: "hand_error", instanceId, error: err });
      this.logger.error(`Hand '${instanceId}' failed: ${err.message}`);

      return {
        success: false,
        error: {
          code: "EXECUTION_ERROR",
          message: err.message,
          recoverable: true,
        },
        duration,
        metrics: instance.getMetrics(),
      };
    } finally {
      await activeHand.stateManager.persistState(instanceId);
    }
  }

  /**
   * Terminate a Hand instance
   */
  async terminate(instanceId: string): Promise<void> {
    const activeHand = this.activeInstances.get(instanceId);
    if (!activeHand) {
      throw new Error(`Hand instance '${instanceId}' not found`);
    }

    try {
      await activeHand.instance.terminate();
    } catch (error) {
      this.logger.warn(`Error terminating Hand '${instanceId}':`, { error: error as Error });
    }

    activeHand.instance.setState({ status: "completed" });
    activeHand.status = "completed";
    activeHand.stateManager.deleteState(instanceId);
    
    this.activeInstances.delete(instanceId);
    this.emit({ type: "hand_terminated", instanceId });
    this.logger.info(`Terminated Hand instance: ${instanceId}`);
  }

  /**
   * Get a Hand instance
   */
  getInstance(instanceId: string): HandInstance | undefined {
    const activeHand = this.activeInstances.get(instanceId);
    return activeHand ? this.toHandInstance(activeHand) : undefined;
  }

  /**
   * List all instances
   */
  listInstances(): HandInstance[] {
    return Array.from(this.activeInstances.values()).map((h) => this.toHandInstance(h));
  }

  /**
   * Get active instances
   */
  getActiveInstances(): HandInstance[] {
    return this.listInstances().filter((i) => i.status === "active");
  }

  // ============ Event System ============

  /**
   * Add event listener
   */
  on(event: string, callback: (event: RegistryEvent) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit event
   */
  private emit(event: RegistryEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(event);
        } catch (error) {
          this.logger.error("Event listener error:", { error: error as Error });
        }
      });
    }
    // Also emit to wildcard listeners
    const wildcard = this.eventListeners.get("*");
    if (wildcard) {
      wildcard.forEach((cb) => {
        try {
          cb(event);
        } catch (error) {
          this.logger.error("Event listener error:", { error: error as Error });
        }
      });
    }
  }

  // ============ Helpers ============

  private generateInstanceId(handId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${handId}-${timestamp}-${random}`;
  }

  private toHandInstance(activeHand: ActiveHand): HandInstance {
    return {
      instanceId: activeHand.instanceId,
      handId: activeHand.handId,
      status: activeHand.status,
      config: activeHand.config,
      createdAt: activeHand.createdAt,
      lastRun: activeHand.lastRun,
      nextRun: activeHand.nextRun,
      progress: activeHand.progress,
      error: activeHand.error,
    };
  }
}

// Default registry instance
let defaultRegistry: HandRegistry | null = null;

export function getDefaultRegistry(): HandRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new HandRegistry();
  }
  return defaultRegistry;
}

export function setDefaultRegistry(registry: HandRegistry): void {
  defaultRegistry = registry;
}
