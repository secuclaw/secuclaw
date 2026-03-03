import type { MemoryEntry, SearchOptions, SearchResult, MemoryIndexConfig } from "./types.js";
import { searchByVector, VectorStore } from "./vector.js";
import { searchByBM25, BM25Store } from "./bm25.js";
import { applyTemporalDecay, DEFAULT_TEMPORAL_DECAY_CONFIG, type TemporalDecayConfig } from "./decay";

export interface HybridSearchResult extends SearchResult {
  vectorScore: number;
  keywordScore: number;
}

function mergeAndRerank(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  vectorWeight: number,
  keywordWeight: number,
  limit: number,
): SearchResult[] {
  const byId = new Map<string, SearchResult>();
  
  for (const result of vectorResults) {
    const existing = byId.get(result.entry.id);
    if (!existing) {
      byId.set(result.entry.id, {
        ...result,
        score: result.score * vectorWeight,
      });
    }
  }
  
  for (const result of keywordResults) {
    const existing = byId.get(result.entry.id);
    if (existing) {
      existing.score += result.score * keywordWeight;
      if (result.highlights.length > 0 && existing.highlights.length === 0) {
        existing.highlights = result.highlights;
      }
    } else {
      byId.set(result.entry.id, {
        ...result,
        score: result.score * keywordWeight,
      });
    }
  }
  
  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export class HybridSearch {
  private vectorStore: VectorStore;
  private bm25Store: BM25Store;
  private config: MemoryIndexConfig;
  
  constructor(config: MemoryIndexConfig) {
    this.config = config;
    this.vectorStore = new VectorStore();
    this.bm25Store = new BM25Store();
  }
  
  async index(entries: MemoryEntry[]): Promise<void> {
    await this.vectorStore.addBatch(entries);
    this.bm25Store.rebuild(entries);
  }
  
  async search(
    query: string,
    options: SearchOptions,
    temporalDecay?: Partial<TemporalDecayConfig>,
  ): Promise<SearchResult[]> {
    const limit = options.limit ?? 10;
    const allEntries = Array.from((this.vectorStore as unknown as { entries: Map<string, MemoryEntry> }).entries?.values?.() ?? []);
    
    const entries = allEntries.length > 0 ? allEntries : [];
    
    const vectorResults = this.config.enableHybrid
      ? await searchByVector(entries, query, { ...options, limit: limit * 2 })
      : [];
    
    const keywordResults = this.config.enableHybrid
      ? await searchByBM25(entries, query, { ...options, limit: limit * 2 })
      : [];
    
    const merged = mergeAndRerank(
      vectorResults,
      keywordResults,
      this.config.vectorWeight,
      this.config.keywordWeight,
      limit * 2,
    );
    
    if (this.config.enableTemporalDecay && temporalDecay?.enabled) {
      const config = { ...DEFAULT_TEMPORAL_DECAY_CONFIG, ...temporalDecay };
      return applyTemporalDecay(merged, config);
    }
    
    return merged.slice(0, limit);
  }
  
  clear(): void {
    this.vectorStore.clear();
  }
}

export function createHybridSearch(config: MemoryIndexConfig): HybridSearch {
  return new HybridSearch(config);
}
