import type { MemoryEntry, SearchOptions, SearchResult } from "./types.js";
import type {
  CompactionResult,
  IMemoryCapabilities,
  IMemoryStore,
  MemoryQuery,
  MemorySearchResult,
  MemoryStats,
} from "./trait.js";

export abstract class BaseMemoryStore implements IMemoryStore {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly capabilities: IMemoryCapabilities;

  abstract initialize(): Promise<void>;
  abstract dispose(): Promise<void>;

  abstract store(entry: MemoryEntry): Promise<string>;
  abstract storeBatch(entries: MemoryEntry[]): Promise<string[]>;
  abstract retrieve(id: string): Promise<MemoryEntry | null>;
  abstract update(id: string, entry: Partial<MemoryEntry>): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteBySession(sessionId: string): Promise<void>;
  abstract clear(): Promise<void>;

  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    return this.hybridSearch(query.query, undefined, query.options);
  }

  async vectorSearch(_embedding: number[], options?: SearchOptions): Promise<MemorySearchResult> {
    return this.keywordSearch(options?.query ?? "", options);
  }

  abstract keywordSearch(query: string, options?: SearchOptions): Promise<MemorySearchResult>;

  async hybridSearch(
    query: string,
    _embedding?: number[],
    options?: SearchOptions,
  ): Promise<MemorySearchResult> {
    return this.keywordSearch(query, options);
  }

  async compact(): Promise<CompactionResult> {
    const before = (await this.stats()).entries;
    return {
      removed: 0,
      before,
      after: before,
    };
  }

  async stats(): Promise<MemoryStats> {
    const all = await this.keywordSearch("", { query: "", limit: 10_000 });
    return {
      entries: all.total,
      approxStorageMb: 0,
    };
  }

  protected wrapResults(items: SearchResult[]): MemorySearchResult {
    return {
      items,
      total: items.length,
    };
  }
}
