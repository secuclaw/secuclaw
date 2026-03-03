import type { MemoryEntry, SearchOptions, SearchResult } from "./types.js";

export interface IMemoryCapabilities {
  readonly vectorSearch: boolean;
  readonly keywordSearch: boolean;
  readonly hybridSearch: boolean;
  readonly persistence: boolean;
  readonly embeddings: boolean;
  readonly compaction: boolean;
  readonly maxEntries: number;
  readonly maxStorageMb: number;
}

export interface MemoryQuery {
  query: string;
  options?: SearchOptions;
}

export interface MemorySearchResult {
  items: SearchResult[];
  total: number;
}

export interface CompactionResult {
  removed: number;
  before: number;
  after: number;
}

export interface MemoryStats {
  entries: number;
  approxStorageMb: number;
}

export interface IMemoryStore {
  readonly id: string;
  readonly name: string;
  readonly capabilities: IMemoryCapabilities;

  store(entry: MemoryEntry): Promise<string>;
  storeBatch(entries: MemoryEntry[]): Promise<string[]>;

  retrieve(id: string): Promise<MemoryEntry | null>;

  search(query: MemoryQuery): Promise<MemorySearchResult>;
  vectorSearch(embedding: number[], options?: SearchOptions): Promise<MemorySearchResult>;
  keywordSearch(query: string, options?: SearchOptions): Promise<MemorySearchResult>;
  hybridSearch(query: string, embedding?: number[], options?: SearchOptions): Promise<MemorySearchResult>;

  update(id: string, entry: Partial<MemoryEntry>): Promise<void>;

  delete(id: string): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;

  compact(): Promise<CompactionResult>;
  stats(): Promise<MemoryStats>;
  clear(): Promise<void>;

  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
