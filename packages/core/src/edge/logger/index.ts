/**
 * Edge Logger - Lightweight logging for edge deployment
 */

import { randomUUID } from "node:crypto";
import { DEFAULT_LOGGER_CONFIG } from "../types.js";
import type { EdgeLogEntry, EdgeLoggerConfig } from "../types.js";
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Edge Logger
 */
export class EdgeLogger {
  private config: EdgeLoggerConfig;
  private entries: EdgeLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private bufferSize = 0;

  constructor(config: Partial<EdgeLoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, meta?: Record<string, unknown>, source?: string): void {
    const entry: EdgeLogEntry = {
      level,
      message,
      timestamp: Date.now(),
      source,
      meta,
    };

    // Check size limit
    const entrySize = this.estimateSize(entry);
    if (entrySize > this.config.maxEntrySize) {
      // Truncate message
      entry.message = message.substring(0, 500) + "...[truncated]";
      entry.meta = { truncated: true, originalSize: entrySize };
    }

    this.addEntry(entry);
  }

  /**
   * Add entry to buffer
   */
  private addEntry(entry: EdgeLogEntry): void {
    // Enforce max entries
    if (this.entries.length >= this.config.maxEntries) {
      const removed = this.entries.shift();
      if (removed) {
        this.bufferSize -= this.estimateSize(removed);
      }
    }

    this.entries.push(entry);
    this.bufferSize += this.estimateSize(entry);
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateSize(entry: EdgeLogEntry): number {
    return JSON.stringify(entry).length * 2; // UTF-16 estimate
  }

  /**
   * Get all entries
   */
  getEntries(options?: {
    level?: LogLevel;
    since?: number;
    limit?: number;
  }): EdgeLogEntry[] {
    let entries = [...this.entries];

    if (options?.level) {
      entries = entries.filter((e) => e.level === options.level);
    }

    if (options?.since) {
      const since = options.since;
      entries = entries.filter((e) => e.timestamp >= since);
    }

    if (options?.limit && options.limit > 0) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  /**
   * Get entry count
   */
  getCount(): number {
    return this.entries.length;
  }

  /**
   * Get buffer size in bytes
   */
  getBufferSize(): number {
    return this.bufferSize;
  }

  /**
   * Analyze logs for patterns
   */
  analyze(options?: {
    since?: number;
    groupBy?: "level" | "source" | "hour";
  }): LogAnalysis {
    let entries = this.entries;

    if (options?.since) {
      const since = options.since;
      entries = entries.filter((e) => e.timestamp >= since);
    }

    const analysis: LogAnalysis = {
      total: entries.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      bySource: {},
      byHour: {},
      topErrors: [],
      topWarnings: [],
    };

    for (const entry of entries) {
      // By level
      analysis.byLevel[entry.level]++;

      // By source
      if (entry.source) {
        analysis.bySource[entry.source] = (analysis.bySource[entry.source] || 0) + 1;
      }

      // By hour
      if (options?.groupBy === "hour") {
        const hour = new Date(entry.timestamp).toISOString().slice(0, 13);
        analysis.byHour[hour] = (analysis.byHour[hour] || 0) + 1;
      }
    }

    // Top errors
    analysis.topErrors = entries
      .filter((e) => e.level === "error")
      .slice(-10)
      .map((e) => ({ message: e.message, timestamp: e.timestamp }));

    // Top warnings
    analysis.topWarnings = entries
      .filter((e) => e.level === "warn")
      .slice(-10)
      .map((e) => ({ message: e.message, timestamp: e.timestamp }));

    return analysis;
  }

  /**
   * Flush logs (to storage if configured)
   */
  async flush(): Promise<void> {
    if (!this.config.persistent || !this.config.storagePath) {
      return;
    }

    // In production, write to file
    // For now, just clear the buffer
    const entries = this.entries.splice(0);
    this.bufferSize = 0;

    // Would write to storage here
    // await writeFile(this.config.storagePath, JSON.stringify(entries));
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.bufferSize = 0;
  }

  /**
   * Shutdown logger
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

/**
 * Log analysis result
 */
export interface LogAnalysis {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  byHour: Record<string, number>;
  topErrors: Array<{ message: string; timestamp: number }>;
  topWarnings: Array<{ message: string; timestamp: number }>;
}

/**
 * Create edge logger instance
 */
export function createEdgeLogger(
  config?: Partial<EdgeLoggerConfig>
): EdgeLogger {
  return new EdgeLogger(config);
}
