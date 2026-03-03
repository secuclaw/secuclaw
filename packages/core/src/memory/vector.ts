import type { MemoryEntry, SearchOptions, SearchResult } from "./types.js";

export interface VectorSearchResult {
  id: string;
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
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

function generateMockEmbedding(text: string): number[] {
  const hash = text.split("").reduce((acc, char) => {
    const charCode = char.charCodeAt(0);
    return ((acc << 5) - acc + charCode + (acc << 6)) | 0;
  }, 0);
  
  const embedding: number[] = [];
  const seed = Math.abs(hash);
  let rng = seed;
  
  for (let i = 0; i < 128; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    embedding.push((rng / 0x7fffffff) * 2 - 1);
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

function computeTextHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateDeterministicEmbedding(text: string, seed: number): number[] {
  const hash = computeTextHash(text + seed);
  const embedding: number[] = [];
  let rng = hash;
  
  for (let i = 0; i < 128; i++) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    embedding.push((rng / 0x7fffffff) * 2 - 1);
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding;
}

export async function searchByVector(
  entries: MemoryEntry[],
  query: string,
  options: SearchOptions,
): Promise<SearchResult[]> {
  const limit = options.limit ?? 10;
  const queryEmbedding = generateMockEmbedding(query);
  
  const entriesWithEmbedding = entries.map((entry) => {
    if (entry.embedding && entry.embedding.length === queryEmbedding.length) {
      return { entry, embedding: entry.embedding };
    }
    const deterministicEmbedding = generateDeterministicEmbedding(entry.content, 42);
    return { entry, embedding: deterministicEmbedding };
  });
  
  const results: SearchResult[] = entriesWithEmbedding
    .map(({ entry, embedding }) => {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return {
        entry,
        score: similarity,
        highlights: [],
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return results;
}

export class VectorStore {
  private entries: Map<string, MemoryEntry> = new Map();
  
  async add(entry: MemoryEntry): Promise<void> {
    const embedding = entry.embedding ?? generateMockEmbedding(entry.content);
    this.entries.set(entry.id, {
      ...entry,
      embedding,
    });
  }
  
  async addBatch(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry);
    }
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const entries = Array.from(this.entries.values());
    return searchByVector(entries, query, options);
  }
  
  get(id: string): MemoryEntry | undefined {
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
}
