export type MemorySource = "conversation" | "analysis" | "incident" | "knowledge" | "system";

export interface MemoryMetadata {
  source: MemorySource;
  timestamp: number;
  sessionId?: string;
  incidentId?: string;
  tags: string[];
  importance: number;
  expiresAt?: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  sources?: MemorySource[];
  tags?: string[];
  minImportance?: number;
  sessionId?: string;
  incidentId?: string;
  since?: number;
  until?: number;
}

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
  highlights: string[];
}

export interface MemoryIndexConfig {
  vectorWeight: number;
  keywordWeight: number;
  enableHybrid: boolean;
  enableTemporalDecay: boolean;
  decayHalfLifeDays: number;
}

export const DEFAULT_MEMORY_INDEX_CONFIG: MemoryIndexConfig = {
  vectorWeight: 0.5,
  keywordWeight: 0.5,
  enableHybrid: true,
  enableTemporalDecay: false,
  decayHalfLifeDays: 30,
};

export interface MemoryStoreConfig {
  dataDir: string;
  maxEntries: number;
  pruneAfterMs: number;
  indexConfig: MemoryIndexConfig;
}

export const DEFAULT_MEMORY_STORE_CONFIG: Omit<MemoryStoreConfig, "dataDir"> = {
  maxEntries: 10000,
  pruneAfterMs: 90 * 24 * 60 * 60 * 1000,
  indexConfig: DEFAULT_MEMORY_INDEX_CONFIG,
};
