import type { MemoryEntry, SearchOptions, SearchResult } from './types.js';

export interface SQLiteVecConfig {
  dbPath: string;
  tableName: string;
  embeddingDimension: number;
}

export const DEFAULT_SQLITE_VEC_CONFIG: Omit<SQLiteVecConfig, 'dbPath'> = {
  tableName: 'memory_vectors',
  embeddingDimension: 128,
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function generateDeterministicEmbedding(text: string, dimension: number = 128): number[] {
  const computeHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const hash = computeHash(text);
  const embedding: number[] = [];
  let rng = hash;

  for (let i = 0; i < dimension; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    embedding.push((rng / 0x7fffffff) * 2 - 1);
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
}

export interface VectorIndexEntry {
  id: string;
  embedding: number[];
  content: string;
  metadata: MemoryEntry['metadata'];
}

export class SQLiteVecStore {
  private entries: Map<string, VectorIndexEntry> = new Map();
  private config: SQLiteVecConfig;
  private initialized = false;

  constructor(config: Partial<SQLiteVecConfig> & { dbPath: string }) {
    this.config = {
      ...DEFAULT_SQLITE_VEC_CONFIG,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Placeholder for SQLite-vec initialization
    // In production, this would load sqlite-vec extension and create tables
    // Example SQL:
    // CREATE VIRTUAL TABLE IF NOT EXISTS ${this.config.tableName} 
    // USING vec0(embedding float[${this.config.embeddingDimension}])
    
    this.initialized = true;
  }

  async add(entry: MemoryEntry): Promise<void> {
    const embedding = entry.embedding ?? 
      generateDeterministicEmbedding(entry.content, this.config.embeddingDimension);

    const indexEntry: VectorIndexEntry = {
      id: entry.id,
      embedding,
      content: entry.content,
      metadata: entry.metadata,
    };

    this.entries.set(entry.id, indexEntry);

    // In production, this would persist to SQLite-vec:
    // INSERT INTO ${this.config.tableName} (rowid, embedding, content, metadata)
    // VALUES (?, vec_f32(?), ?, ?)
  }

  async addBatch(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry);
    }
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const limit = options.limit ?? 10;
    const queryEmbedding = generateDeterministicEmbedding(query, this.config.embeddingDimension);

    let candidates = Array.from(this.entries.values());

    if (options.sources && options.sources.length > 0) {
      candidates = candidates.filter(e => options.sources!.includes(e.metadata.source));
    }

    if (options.minImportance !== undefined) {
      candidates = candidates.filter(e => e.metadata.importance >= options.minImportance!);
    }

    if (options.since !== undefined) {
      candidates = candidates.filter(e => e.metadata.timestamp >= options.since!);
    }

    if (options.until !== undefined) {
      candidates = candidates.filter(e => e.metadata.timestamp <= options.until!);
    }

    const results = candidates
      .map(entry => {
        const score = cosineSimilarity(queryEmbedding, entry.embedding);
        return {
          entry: {
            id: entry.id,
            content: entry.content,
            metadata: entry.metadata,
            embedding: entry.embedding,
          },
          score,
          highlights: [],
        };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  get(id: string): VectorIndexEntry | undefined {
    return this.entries.get(id);
  }

  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  getAll(): VectorIndexEntry[] {
    return Array.from(this.entries.values());
  }

  async persist(): Promise<void> {
    // Placeholder for persisting to SQLite
    // In production: serialize and write to disk
  }

  async load(): Promise<void> {
    // Placeholder for loading from SQLite
    // In production: deserialize and load from disk
  }

  async searchByVector(
    embedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const limit = options.limit ?? 10;

    const results = Array.from(this.entries.values())
      .map(entry => {
        const score = cosineSimilarity(embedding, entry.embedding);
        return {
          entry: {
            id: entry.id,
            content: entry.content,
            metadata: entry.metadata,
            embedding: entry.embedding,
          },
          score,
          highlights: [],
        };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  getStats(): {
    totalEntries: number;
    avgEmbeddingDimension: number;
    sources: Record<string, number>;
  } {
    const sources: Record<string, number> = {};
    let totalDimension = 0;

    for (const entry of this.entries.values()) {
      sources[entry.metadata.source] = (sources[entry.metadata.source] ?? 0) + 1;
      totalDimension += entry.embedding.length;
    }

    return {
      totalEntries: this.entries.size,
      avgEmbeddingDimension: this.entries.size > 0 
        ? totalDimension / this.entries.size 
        : this.config.embeddingDimension,
      sources,
    };
  }
}

export function createSQLiteVecStore(
  config: Partial<SQLiteVecConfig> & { dbPath: string }
): SQLiteVecStore {
  return new SQLiteVecStore(config);
}
