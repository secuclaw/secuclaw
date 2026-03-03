/**
 * Edge Runtime Module
 * Lightweight deployment for edge devices (<20MB memory)
 */

// Types
export type {
  EdgeConfig,
  EdgeModule,
  EdgeStatus,
  EdgeEvent,
  EdgeEventHandler,
  EdgeEventType,
  MemoryStats,
  EdgeScanResult,
  EdgeScanConfig,
  EdgeLogEntry,
  EdgeLoggerConfig,
  EdgeAlert,
  EdgeAlerterConfig,
} from "./types.js";

// Constants
export {
  DEFAULT_EDGE_CONFIG,
  DEFAULT_SCAN_CONFIG,
  DEFAULT_LOGGER_CONFIG,
  DEFAULT_ALERTER_CONFIG,
} from "./types.js";

// Runtime
export { EdgeRuntime, createEdgeRuntime } from "./runtime/index.js";
export { MemoryOptimizer, createMemoryOptimizer, ObjectPool } from "./runtime/memory.js";
export { LazyLoader, createLazyLoader, lazy } from "./runtime/lazy.js";

// Tools
export { EdgeScanner, createEdgeScanner } from "./scanner/index.js";
export { EdgeLogger, createEdgeLogger } from "./logger/index.js";
export { EdgeAlerter, createEdgeAlerter } from "./alerter/index.js";

// Convenience function to create a complete edge runtime
import { EdgeRuntime, createEdgeRuntime } from "./runtime/index.js";
import { MemoryOptimizer, createMemoryOptimizer } from "./runtime/memory.js";
import { LazyLoader, createLazyLoader } from "./runtime/lazy.js";
import { EdgeScanner, createEdgeScanner } from "./scanner/index.js";
import { EdgeLogger, createEdgeLogger } from "./logger/index.js";
import { EdgeAlerter, createEdgeAlerter } from "./alerter/index.js";
import type { EdgeConfig, EdgeScanConfig, EdgeLoggerConfig, EdgeAlerterConfig } from "./types.js";

export interface EdgeDeploymentOptions {
  runtime?: Partial<EdgeConfig>;
  scanner?: Partial<EdgeScanConfig>;
  logger?: Partial<EdgeLoggerConfig>;
  alerter?: Partial<EdgeAlerterConfig>;
}

export interface EdgeDeployment {
  runtime: EdgeRuntime;
  optimizer: MemoryOptimizer;
  loader: LazyLoader;
  scanner: EdgeScanner;
  logger: EdgeLogger;
  alerter: EdgeAlerter;
  shutdown: () => Promise<void>;
}

/**
 * Create a complete edge deployment
 */
export async function createEdgeDeployment(
  options: EdgeDeploymentOptions = {}
): Promise<EdgeDeployment> {
  // Create components
  const runtime = createEdgeRuntime(options.runtime);
  const optimizer = createMemoryOptimizer();
  const loader = createLazyLoader();
  const scanner = createEdgeScanner(options.scanner);
  const logger = createEdgeLogger(options.logger);
  const alerter = createEdgeAlerter(options.alerter);

  // Wire up logger to alerter
  alerter.setLogger(logger);

  // Initialize runtime
  await runtime.initialize();

  // Shutdown function
  const shutdown = async () => {
    alerter.shutdown();
    logger.shutdown();
    await runtime.shutdown();
  };

  return {
    runtime,
    optimizer,
    loader,
    scanner,
    logger,
    alerter,
    shutdown,
  };
}
