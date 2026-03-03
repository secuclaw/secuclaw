import type {
  DataSource,
  RawDataEvent,
  NormalizedEvent,
  DataFusionResult,
  PipelineConfig,
  PipelineStats,
  AssetInfo,
  VulnerabilityInfo,
  ThreatIntelligence,
} from "./types.js";
import {
  createConnector,
  normalizeEvent,
  type DataConnector,
} from "./connectors.js";
import { DataFusionEngine } from "./fusion.js";
import { DEFAULT_PIPELINE_CONFIG } from "./types.js";

type EventCallback = (event: NormalizedEvent) => void;
type FusionCallback = (result: DataFusionResult) => void;

export class DataPipeline {
  private config: PipelineConfig;
  private sources: Map<string, DataSource> = new Map();
  private connectors: Map<string, DataConnector> = new Map();
  private fusionEngine: DataFusionEngine;
  private eventCallbacks: Set<EventCallback> = new Set();
  private fusionCallbacks: Set<FusionCallback> = new Set();
  private eventQueue: NormalizedEvent[] = [];
  private stats: PipelineStats;
  private flushTimer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.fusionEngine = new DataFusionEngine();
    this.stats = {
      totalEvents: 0,
      eventsPerSecond: 0,
      eventsBySource: new Map(),
      eventsByType: new Map(),
      avgProcessingTime: 0,
      errorCount: 0,
      queueSize: 0,
    };
  }

  async addSource(source: DataSource): Promise<boolean> {
    if (this.sources.has(source.id)) {
      return false;
    }

    this.sources.set(source.id, source);

    const connector = createConnector(source);
    const connected = await connector.connect();

    if (!connected) {
      source.status = "error";
      source.errorCount++;
      return false;
    }

    source.status = "connected";
    this.connectors.set(source.id, connector);

    connector.subscribe((rawEvent: RawDataEvent) => {
      this.processRawEvent(rawEvent);
    });

    return true;
  }

  async removeSource(sourceId: string): Promise<void> {
    const connector = this.connectors.get(sourceId);
    if (connector) {
      await connector.disconnect();
      this.connectors.delete(sourceId);
    }
    this.sources.delete(sourceId);
  }

  getSource(sourceId: string): DataSource | undefined {
    return this.sources.get(sourceId);
  }

  getSources(): DataSource[] {
    return Array.from(this.sources.values());
  }

  async fetchAllSources(): Promise<number> {
    let totalEvents = 0;

    for (const [sourceId, connector] of this.connectors) {
      const source = this.sources.get(sourceId);
      if (!source || !source.enabled) continue;

      try {
        const rawEvents = await connector.fetch(source.lastSync);
        for (const rawEvent of rawEvents) {
          this.processRawEvent(rawEvent);
          totalEvents++;
        }
        source.lastSync = Date.now();
        source.errorCount = 0;
      } catch (error) {
        source.errorCount++;
        source.status = source.errorCount > 3 ? "error" : "connected";
        this.stats.errorCount++;
        this.stats.lastError = String(error);
      }
    }

    return totalEvents;
  }

  private processRawEvent(rawEvent: RawDataEvent): void {
    const startTime = Date.now();

    try {
      const normalized = normalizeEvent(rawEvent);

      if (this.config.enableEnrichment) {
        const enriched = this.fusionEngine.enrichEvent(normalized);
        this.eventQueue.push(enriched);
      } else {
        this.eventQueue.push(normalized);
      }

      this.updateStats(normalized, startTime);

      if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }
    } catch (error) {
      this.stats.errorCount++;
      this.stats.lastError = String(error);
    }
  }

  private updateStats(event: NormalizedEvent, startTime: number): void {
    this.stats.totalEvents++;
    this.stats.queueSize = this.eventQueue.length;

    const sourceCount = this.stats.eventsBySource.get(event.sourceId) || 0;
    this.stats.eventsBySource.set(event.sourceId, sourceCount + 1);

    const typeCount = this.stats.eventsByType.get(event.eventType) || 0;
    this.stats.eventsByType.set(event.eventType, typeCount + 1);

    const processingTime = Date.now() - startTime;
    this.stats.avgProcessingTime =
      (this.stats.avgProcessingTime * (this.stats.totalEvents - 1) +
        processingTime) /
      this.stats.totalEvents;
  }

  flush(): void {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];
    this.stats.queueSize = 0;

    if (this.config.enableCorrelation) {
      this.fusionEngine.addEvents(events);
    }

    for (const event of events) {
      for (const callback of this.eventCallbacks) {
        callback(event);
      }

      if (this.config.enableCorrelation) {
        const fusionResults = this.fusionEngine.correlate(event);
        for (const result of fusionResults) {
          for (const callback of this.fusionCallbacks) {
            callback(result);
          }
        }
      }
    }
  }

  addAsset(asset: AssetInfo): void {
    this.fusionEngine.addAsset(asset);
  }

  addVulnerability(vuln: VulnerabilityInfo): void {
    this.fusionEngine.addVulnerability(vuln);
  }

  addThreatIntel(ti: ThreatIntelligence): void {
    this.fusionEngine.addThreatIntel(ti);
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  onFusion(callback: FusionCallback): () => void {
    this.fusionCallbacks.add(callback);
    return () => this.fusionCallbacks.delete(callback);
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.flushTimer = setInterval(() => {
      this.flush();
      this.updateEventsPerSecond();
    }, this.config.flushInterval);
  }

  stop(): void {
    this.running = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flush();
  }

  private updateEventsPerSecond(): void {
    this.stats.eventsPerSecond =
      this.stats.totalEvents / (this.config.flushInterval / 1000);
  }

  getStats(): PipelineStats {
    return { ...this.stats };
  }

  getFusionStats(): ReturnType<DataFusionEngine["getStats"]> {
    return this.fusionEngine.getStats();
  }

  addCustomCorrelationRule(rule: {
    id: string;
    name: string;
    description: string;
    timeWindow: number;
    conditions: Array<{
      field: string;
      operator: "equals" | "contains" | "matches" | "exists";
      value?: string;
    }>;
    minMatches: number;
    riskBoost: number;
    tags: string[];
  }): void {
    this.fusionEngine.addCorrelationRule(rule);
  }

  ingestRawEvent(rawEvent: RawDataEvent): NormalizedEvent | undefined {
    this.processRawEvent(rawEvent);

    if (this.eventQueue.length > 0) {
      return this.eventQueue[this.eventQueue.length - 1];
    }
    return undefined;
  }

  ingestNormalizedEvent(event: NormalizedEvent): void {
    this.eventQueue.push(event);
    this.updateStats(event, Date.now());

    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }
}

export function createDataPipeline(
  config?: Partial<PipelineConfig>
): DataPipeline {
  return new DataPipeline(config);
}
