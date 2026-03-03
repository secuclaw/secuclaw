/**
 * Hand Framework - Main Export
 * 
 * Unified export point for the Hand framework.
 */

// Types
export type {
  HandCategory,
  HandStatus,
  HandDefinition,
  HandInstance,
  HandRequirement,
  HandSetting,
  HandMetric,
  ScheduleConfig,
  HandInstallInfo,
} from "./types.js";

export type {
  Logger,
  Storage,
  MemoryStore,
  ToolDefinition,
  ToolRegistry,
  ProgressReporter,
  MetricReporter,
  EventEmitter,
  HandContext,
} from "./context.js";

export type {
  HandError,
  HandArtifact,
  HandResult,
} from "./result.js";

export type {
  HandState,
} from "./state.js";

export type {
  RequirementCheckResult,
} from "./requirements.js";

// Classes
export {
  BaseHand,
  createDefaultLogger,
  createDefaultStorage,
  createDefaultMemoryStore,
  createDefaultToolRegistry,
} from "./base.js";

export type {
  ProgressCallback,
  ErrorCallback,
} from "./base.js";

export {
  HandStateManager,
  createInitialState,
} from "./state.js";

export type {
  StateStorageAdapter,
  SQLiteStateStorageAdapter,
} from "./state.js";

export {
  RequirementChecker,
} from "./requirements.js";

export {
  HandRegistry,
  getDefaultRegistry,
  setDefaultRegistry,
} from "./registry.js";

export type {
  HandConstructor,
  RegistryEvent,
  HandRegistryOptions,
} from "./registry.js";

// Result factories
export {
  createSuccessResult,
  createErrorResult,
  createArtifact,
} from "./result.js";
