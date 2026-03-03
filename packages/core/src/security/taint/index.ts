/**
 * Taint Tracking System
 * 
 * Information flow taint tracking for security.
 */

// ============================================================================
// Types
// ============================================================================

export type TaintLabel = "pii" | "credentials" | "financial" | "health" | "classified" | "internal";

export interface TaintSource {
  id: string;
  label: TaintLabel;
  description: string;
  createdAt: Date;
}

export interface TaintSink {
  id: string;
  name: string;
  type: "log" | "network" | "file" | "console";
}

export interface TaintedData<T = unknown> {
  value: T;
  labels: TaintLabel[];
  source?: TaintSource;
  createdAt: Date;
}

export interface FlowPath {
  source: TaintSource;
  sinks: TaintSink[];
  operations: string[];
  violated: boolean;
}

export interface PolicyResult {
  allowed: boolean;
  violations: string[];
}

// ============================================================================
// Taint Tracker
// ============================================================================

/**
 * Tracks information flow and detects policy violations
 */
export class TaintTracker {
  private sources = new Map<string, TaintedData>();
  private sinks = new Map<string, TaintSink>();
  private flows: FlowPath[] = [];

  /**
   * Mark data as tainted from a source
   */
  taintSource<T>(label: TaintLabel, value: T, description: string): TaintedData<T> {
    const source: TaintSource = {
      id: crypto.randomUUID(),
      label,
      description,
      createdAt: new Date(),
    };
    
    const tainted: TaintedData<T> = {
      value,
      labels: [label],
      source,
      createdAt: new Date(),
    };
    
    this.sources.set(tainted.source!.id, tainted);
    return tainted;
  }

  /**
   * Add a label to existing tainted data
   */
  addLabel<T>(data: TaintedData<T>, label: TaintLabel): TaintedData<T> {
    if (!data.labels.includes(label)) {
      data.labels.push(label);
    }
    return data;
  }

  /**
   * Check if data has a specific label
   */
  hasLabel(data: TaintedData<unknown>, label: TaintLabel): boolean {
    return data.labels.includes(label);
  }

  /**
   * Register a sink
   */
  registerSink(sink: TaintSink): void {
    this.sinks.set(sink.id, sink);
  }

  /**
   * Check if data can flow to a sink (policy check)
   */
  checkSink(data: TaintedData<unknown>, sinkId: string): PolicyResult {
    const sink = this.sinks.get(sinkId);
    if (!sink) {
      return { allowed: false, violations: ["Unknown sink"] };
    }
    
    const violations: string[] = [];
    
    // Check label restrictions per sink type
    for (const label of data.labels) {
      if (sink.type === "log" && label === "credentials") {
        violations.push(`Cannot log credentials (${label})`);
      }
      if (sink.type === "network" && label === "classified") {
        violations.push(`Cannot send classified data over network (${label})`);
      }
    }
    
    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Propagate taint through an operation
   */
  propagate<T, R>(data: TaintedData<T>, operation: string): TaintedData<R> {
    return {
      value: null as unknown as R,
      labels: [...data.labels],
      source: data.source,
      createdAt: new Date(),
    };
  }

  /**
   * Analyze flow from source to sink
   */
  analyzeFlow(sourceId: string, sinkId: string): FlowPath | undefined {
    const source = this.sources.get(sourceId) as TaintedData | undefined;
    const sink = this.sinks.get(sinkId);
    
    if (!source || !sink) return undefined;
    
    return {
      source: source.source!,
      sinks: [sink],
      operations: [],
      violated: !this.checkSink(source, sinkId).allowed,
    };
  }

  /**
   * Get all sources
   */
  listSources(): TaintedData[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get all sinks
   */
  listSinks(): TaintSink[] {
    return Array.from(this.sinks.values());
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new taint tracker
 */
export function createTaintTracker(): TaintTracker {
  return new TaintTracker();
}
