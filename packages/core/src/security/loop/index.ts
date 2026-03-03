/**
 * Tool Call Loop Protection
 * 
 * Detection and prevention of infinite tool call loops.
 */

import { createHash } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface CallRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  fingerprint: string;
  timestamp: number;
  result?: unknown;
}

export interface LoopDetectionResult {
  isLoop: boolean;
  repeatedCalls: number;
  fingerprints: string[];
  suggestedAction: "continue" | "break" | "escalate";
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure?: number;
  nextRetry?: number;
}

// ============================================================================
// Hasher
// ============================================================================

/**
 * Creates fingerprints for tool calls
 */
export class CallHasher {
  /**
   * Create fingerprint from tool call
   */
  fingerprint(toolName: string, args: Record<string, unknown>): string {
    const normalized = JSON.stringify({ tool: toolName, args: this.normalizeArgs(args) });
    return createHash("sha256").update(normalized).digest("hex").substring(0, 16);
  }

  /**
   * Normalize args for consistent hashing
   */
  private normalizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "object" && value !== null) {
        normalized[key] = "[object]";
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }
}

// ============================================================================
// Loop Detector
// ============================================================================

/**
 * Detects repetitive tool call patterns
 */
export class LoopDetector {
  private records: CallRecord[] = [];
  private readonly MAX_RECORDS = 100;
  private readonly WINDOW_MS = 60000; // 1 minute
  
  private hasher = new CallHasher();

  /**
   * Record a tool call
   */
  record(toolName: string, args: Record<string, unknown>): CallRecord {
    const fingerprint = this.hasher.fingerprint(toolName, args);
    const record: CallRecord = {
      id: crypto.randomUUID(),
      toolName,
      args,
      fingerprint,
      timestamp: Date.now(),
    };
    
    this.records.push(record);
    
    // Clean old records
    this.cleanup();
    
    return record;
  }

  /**
   * Detect if there's a loop
   */
  detect(): LoopDetectionResult {
    this.cleanup();
    
    if (this.records.length < 3) {
      return { isLoop: false, repeatedCalls: 0, fingerprints: [], suggestedAction: "continue" };
    }
    
    // Count fingerprints
    const fingerprintCounts = new Map<string, number>();
    for (const record of this.records) {
      fingerprintCounts.set(record.fingerprint, (fingerprintCounts.get(record.fingerprint) || 0) + 1);
    }
    
    // Find most repeated
    let maxCount = 0;
    let maxFingerprint = "";
    for (const [fp, count] of fingerprintCounts) {
      if (count > maxCount) {
        maxCount = count;
        maxFingerprint = fp;
      }
    }
    
    const isLoop = maxCount >= 3;
    
    return {
      isLoop,
      repeatedCalls: maxCount,
      fingerprints: maxFingerprint ? [maxFingerprint] : [],
      suggestedAction: isLoop ? "break" : "continue",
    };
  }

  /**
   * Clear detection state
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Clean up old records
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.WINDOW_MS;
    this.records = this.records.filter(r => r.timestamp > cutoff);
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }
  }
}

// ============================================================================
// Circuit Breaker
// ============================================================================

/**
 * Circuit breaker for tool calls
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
  };
  
  constructor(
    private readonly threshold = 5,
    private readonly resetTimeout = 60000
  ) {}

  /**
   * Record a success
   */
  success(): void {
    this.state.failureCount = 0;
    this.state.isOpen = false;
  }

  /**
   * Record a failure
   */
  failure(): void {
    this.state.failureCount++;
    this.state.lastFailure = Date.now();
    
    if (this.state.failureCount >= this.threshold) {
      this.state.isOpen = true;
      this.state.nextRetry = Date.now() + this.resetTimeout;
    }
  }

  /**
   * Check if call is allowed
   */
  canExecute(): boolean {
    if (!this.state.isOpen) return true;
    
    if (this.state.nextRetry && Date.now() > this.state.nextRetry) {
      this.state.isOpen = false;
      this.state.failureCount = 0;
      return true;
    }
    
    return false;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = { isOpen: false, failureCount: 0 };
  }
}

// ============================================================================
// Tracker
// ============================================================================

/**
 * High-level tool call tracker with loop protection
 */
export class ToolCallTracker {
  private detector = new LoopDetector();
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Track a tool call
   */
  track(toolName: string, args: Record<string, unknown>): LoopDetectionResult {
    const record = this.detector.record(toolName, args);
    return this.detector.detect();
  }

  /**
   * Record success for a tool
   */
  recordSuccess(toolName: string): void {
    this.getBreaker(toolName).success();
  }

  /**
   * Record failure for a tool
   */
  recordFailure(toolName: string): void {
    this.getBreaker(toolName).failure();
  }

  /**
   * Check if tool can be executed
   */
  canExecute(toolName: string): boolean {
    return this.getBreaker(toolName).canExecute();
  }

  /**
   * Get breaker for tool
   */
  private getBreaker(toolName: string): CircuitBreaker {
    if (!this.breakers.has(toolName)) {
      this.breakers.set(toolName, new CircuitBreaker());
    }
    return this.breakers.get(toolName)!;
  }

  /**
   * Reset all tracking
   */
  reset(): void {
    this.detector.reset();
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create tool call tracker
 */
export function createToolCallTracker(): ToolCallTracker {
  return new ToolCallTracker();
}
