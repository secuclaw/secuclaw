/**
 * Edge Runtime Types
 * Types for lightweight edge deployment
 */

// =============================================================================
// Edge Configuration
// =============================================================================

export interface EdgeConfig {
  /** Maximum memory in MB (default: 20) */
  maxMemoryMB: number;
  /** Enable lazy loading */
  lazyLoading: boolean;
  /** Module preload list */
  preloadModules: string[];
  /** Log level for edge */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Enable compression */
  compression: boolean;
  /** Health check interval in ms */
  healthCheckInterval: number;
}

export const DEFAULT_EDGE_CONFIG: EdgeConfig = {
  maxMemoryMB: 20,
  lazyLoading: true,
  preloadModules: [],
  logLevel: "warn",
  compression: true,
  healthCheckInterval: 30000,
};

// =============================================================================
// Edge Module
// =============================================================================

export interface EdgeModule {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Module size in bytes */
  size: number;
  /** Module dependencies */
  dependencies: string[];
  /** Is module loaded */
  loaded: boolean;
  /** Load priority (higher = more important) */
  priority: number;
  /** Load function */
  load: () => Promise<unknown>;
  /** Unload function */
  unload?: () => Promise<void>;
}

// =============================================================================
// Memory Stats
// =============================================================================

export interface MemoryStats {
  /** Total heap size in bytes */
  heapTotal: number;
  /** Used heap size in bytes */
  heapUsed: number;
  /** External memory in bytes */
  external: number;
  /** Array buffers in bytes */
  arrayBuffers: number;
  /** RSS (Resident Set Size) in bytes */
  rss: number;
  /** Memory usage percentage */
  usagePercent: number;
}

// =============================================================================
// Edge Status
// =============================================================================

export interface EdgeStatus {
  /** Is runtime initialized */
  initialized: boolean;
  /** Current memory usage */
  memory: MemoryStats;
  /** Loaded modules */
  loadedModules: string[];
  /** Uptime in ms */
  uptime: number;
  /** Health status */
  healthy: boolean;
  /** Last health check */
  lastHealthCheck: number;
}

// =============================================================================
// Edge Events
// =============================================================================

export type EdgeEventType =
  | "initialized"
  | "module_loaded"
  | "module_unloaded"
  | "memory_warning"
  | "memory_critical"
  | "health_check"
  | "error";

export interface EdgeEvent {
  type: EdgeEventType;
  timestamp: number;
  data?: unknown;
}

export type EdgeEventHandler = (event: EdgeEvent) => void;

// =============================================================================
// Scanner Types
// =============================================================================

export interface EdgeScanResult {
  /** Scan ID */
  id: string;
  /** Target scanned */
  target: string;
  /** Scan type */
  type: "port" | "vuln" | "config" | "compliance";
  /** Scan status */
  status: "running" | "completed" | "failed" | "timeout";
  /** Findings count */
  findings: number;
  /** Severity breakdown */
  severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Scan duration in ms */
  duration: number;
  /** Timestamp */
  timestamp: number;
  /** Raw results (compressed if enabled) */
  raw?: string;
}

export interface EdgeScanConfig {
  /** Scan timeout in ms */
  timeout: number;
  /** Max concurrent scans */
  maxConcurrent: number;
  /** Enable compression for results */
  compressResults: boolean;
  /** Max result size in bytes */
  maxResultSize: number;
}

export const DEFAULT_SCAN_CONFIG: EdgeScanConfig = {
  timeout: 60000,
  maxConcurrent: 3,
  compressResults: true,
  maxResultSize: 1024 * 1024, // 1MB
};

// =============================================================================
// Logger Types
// =============================================================================

export interface EdgeLogEntry {
  /** Log level */
  level: "debug" | "info" | "warn" | "error";
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: number;
  /** Source module */
  source?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface EdgeLoggerConfig {
  /** Max log entries in memory */
  maxEntries: number;
  /** Enable persistent storage */
  persistent: boolean;
  /** Storage path (if persistent) */
  storagePath?: string;
  /** Flush interval in ms */
  flushInterval: number;
  /** Max entry size in bytes */
  maxEntrySize: number;
}

export const DEFAULT_LOGGER_CONFIG: EdgeLoggerConfig = {
  maxEntries: 1000,
  persistent: false,
  flushInterval: 5000,
  maxEntrySize: 4096, // 4KB
};

// =============================================================================
// Alerter Types
// =============================================================================

export interface EdgeAlert {
  /** Alert ID */
  id: string;
  /** Alert severity */
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** Alert title */
  title: string;
  /** Alert description */
  description: string;
  /** Source */
  source: string;
  /** Timestamp */
  timestamp: number;
  /** Is acknowledged */
  acknowledged: boolean;
  /** Additional data */
  data?: Record<string, unknown>;
}

export interface EdgeAlerterConfig {
  /** Max alerts in memory */
  maxAlerts: number;
  /** Forward endpoint */
  forwardEndpoint?: string;
  /** Forward interval in ms */
  forwardInterval: number;
  /** Include logs with alerts */
  includeLogs: boolean;
  /** Retry attempts */
  retryAttempts: number;
}

export const DEFAULT_ALERTER_CONFIG: EdgeAlerterConfig = {
  maxAlerts: 500,
  forwardInterval: 10000,
  includeLogs: true,
  retryAttempts: 3,
};
