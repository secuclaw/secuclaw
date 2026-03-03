import type { RoutingResult, TaskCategory } from "./intelligent-router.js";

export interface CostConfig {
  inputCostPer1k: number;
  outputCostPer1k: number;
  cacheDiscount: number;
}

export interface UsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
  taskCategory: TaskCategory;
}

export interface CacheEntry {
  hash: string;
  result: string;
  timestamp: number;
  hitCount: number;
  provider: string;
  model: string;
}

export interface CostOptimizationResult {
  cached: boolean;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  routing: RoutingResult;
}

export interface BatchTask {
  id: string;
  query: string;
  taskCategory: TaskCategory;
  priority: "high" | "medium" | "low";
  submittedAt: number;
  deadline?: number;
}

export interface BatchResult {
  taskId: string;
  success: boolean;
  result?: string;
  cost: number;
  durationMs: number;
}

const PROVIDER_COSTS: Record<string, CostConfig> = {
  ollama: { inputCostPer1k: 0, outputCostPer1k: 0, cacheDiscount: 0 },
  zhipu: { inputCostPer1k: 0.005, outputCostPer1k: 0.005, cacheDiscount: 0.5 },
  minimax: { inputCostPer1k: 0.003, outputCostPer1k: 0.003, cacheDiscount: 0.5 },
  deepseek: { inputCostPer1k: 0.001, outputCostPer1k: 0.002, cacheDiscount: 0.5 },
  openai: { inputCostPer1k: 0.01, outputCostPer1k: 0.03, cacheDiscount: 0.5 },
  anthropic: { inputCostPer1k: 0.008, outputCostPer1k: 0.024, cacheDiscount: 0.5 },
  google: { inputCostPer1k: 0.004, outputCostPer1k: 0.012, cacheDiscount: 0.5 },
};

const CACHE_TTL_MS = 3600000;
const MAX_CACHE_SIZE = 1000;
const BATCH_WINDOW_MS = 5000;
const MAX_BATCH_SIZE = 20;

function computeHash(query: string, context?: Record<string, unknown>): string {
  let str = query.toLowerCase().trim();
  if (context) {
    str += JSON.stringify(context);
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export class CostOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private usageLog: UsageRecord[] = [];
  private batchQueue: BatchTask[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private totalSavings = 0;
  private totalCost = 0;

  getCache(): Map<string, CacheEntry> {
    return this.cache;
  }

  checkCache(query: string, context?: Record<string, unknown>): CacheEntry | null {
    const hash = computeHash(query, context);
    const entry = this.cache.get(hash);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(hash);
      return null;
    }

    entry.hitCount++;
    return entry;
  }

  setCache(query: string, result: string, routing: RoutingResult, context?: Record<string, unknown>): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    const hash = computeHash(query, context);
    this.cache.set(hash, {
      hash,
      result,
      timestamp: Date.now(),
      hitCount: 0,
      provider: routing.provider,
      model: routing.model,
    });
  }

  calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
    const config = PROVIDER_COSTS[provider] ?? { inputCostPer1k: 0, outputCostPer1k: 0 };
    return (inputTokens / 1000) * config.inputCostPer1k + (outputTokens / 1000) * config.outputCostPer1k;
  }

  recordUsage(record: UsageRecord): void {
    this.usageLog.push(record);
    this.totalCost += record.cost;
    if (record.cached) {
      this.totalSavings += record.cost * 0.9;
    }
  }

  optimizeRouting(routing: RoutingResult, query: string): CostOptimizationResult {
    const cachedEntry = this.checkCache(query);

    if (cachedEntry) {
      const originalCost = this.calculateCost(routing.provider, 1000, 500);
      return {
        cached: true,
        originalCost,
        optimizedCost: 0,
        savings: originalCost,
        routing: {
          ...routing,
          provider: cachedEntry.provider,
          model: cachedEntry.model,
          reason: `Cache hit: ${cachedEntry.hitCount} previous hits`,
        },
      };
    }

    const cost = this.calculateCost(routing.provider, 1000, 500);
    return {
      cached: false,
      originalCost: cost,
      optimizedCost: cost,
      savings: 0,
      routing,
    };
  }

  selectCostEffectiveModel(
    taskCategory: TaskCategory,
    availableModels: Array<{ provider: string; model: string; costTier: string }>,
  ): { provider: string; model: string } {
    const sorted = [...availableModels].sort((a, b) => {
      const costA = PROVIDER_COSTS[a.provider]?.inputCostPer1k ?? 0;
      const costB = PROVIDER_COSTS[b.provider]?.inputCostPer1k ?? 0;
      return costA - costB;
    });

    const selected = sorted[0];
    return { provider: selected.provider, model: selected.model };
  }

  addToBatch(task: BatchTask): void {
    this.batchQueue.push(task);

    if (this.batchQueue.length >= MAX_BATCH_SIZE) {
      this.processBatch();
      return;
    }

    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, BATCH_WINDOW_MS);
    }
  }

  private processBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    if (batch.length === 0) return;

    const highPriority = batch.filter((t) => t.priority === "high");
    const normalPriority = batch.filter((t) => t.priority !== "high");

    highPriority.sort((a, b) => a.submittedAt - b.submittedAt);
    normalPriority.sort((a, b) => a.submittedAt - b.submittedAt);

    const sorted = [...highPriority, ...normalPriority];
  }

  getBatchQueue(): BatchTask[] {
    return [...this.batchQueue];
  }

  getStats(): {
    totalCost: number;
    totalSavings: number;
    cacheHits: number;
    cacheSize: number;
    averageCostPerQuery: number;
  } {
    const cacheHits = Array.from(this.cache.values()).reduce((sum, e) => sum + e.hitCount, 0);
    const queryCount = this.usageLog.length || 1;

    return {
      totalCost: this.totalCost,
      totalSavings: this.totalSavings,
      cacheHits,
      cacheSize: this.cache.size,
      averageCostPerQuery: this.totalCost / queryCount,
    };
  }

  getUsageLog(limit?: number): UsageRecord[] {
    const log = [...this.usageLog].reverse();
    return limit ? log.slice(0, limit) : log;
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetStats(): void {
    this.totalCost = 0;
    this.totalSavings = 0;
    this.usageLog = [];
  }
}

export const costOptimizer = new CostOptimizer();

export function optimizeRequest(
  query: string,
  routing: RoutingResult,
): CostOptimizationResult {
  return costOptimizer.optimizeRouting(routing, query);
}

export function getCachedResult(query: string): CacheEntry | null {
  return costOptimizer.checkCache(query);
}

export function cacheResult(query: string, result: string, routing: RoutingResult): void {
  costOptimizer.setCache(query, result, routing);
}
