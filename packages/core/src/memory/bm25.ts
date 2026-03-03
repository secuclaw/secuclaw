import type { MemoryEntry, SearchOptions, SearchResult } from "./types.js";

interface BM25Document {
  id: string;
  content: string;
  terms: Map<string, number>;
  length: number;
}

interface BM25Index {
  documents: Map<string, BM25Document>;
  documentCount: number;
  averageDocumentLength: number;
  termDocumentFrequency: Map<string, number>;
}

const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[\p{L}\p{N}_]+/gu)
    ?.map((t) => t.trim())
    .filter(Boolean) ?? [];
}

function buildIndex(entries: MemoryEntry[]): BM25Index {
  const documents = new Map<string, BM25Document>();
  const termDocumentFrequency = new Map<string, number>();
  let totalLength = 0;
  
  for (const entry of entries) {
    const terms = tokenize(entry.content);
    const termCounts = new Map<string, number>();
    
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }
    
    const doc: BM25Document = {
      id: entry.id,
      content: entry.content,
      terms: termCounts,
      length: terms.length,
    };
    
    documents.set(entry.id, doc);
    totalLength += terms.length;
    
    for (const term of termCounts.keys()) {
      termDocumentFrequency.set(term, (termDocumentFrequency.get(term) ?? 0) + 1);
    }
  }
  
  const documentCount = documents.size;
  const averageDocumentLength = documentCount > 0 ? totalLength / documentCount : 0;
  
  return {
    documents,
    documentCount,
    averageDocumentLength,
    termDocumentFrequency,
  };
}

function calculateIDF(term: string, index: BM25Index): number {
  const df = index.termDocumentFrequency.get(term) ?? 0;
  if (df === 0) {
    return 0;
  }
  return Math.log((index.documentCount - df + 0.5) / (df + 0.5) + 1);
}

function calculateBM25Score(doc: BM25Document, queryTerms: string[], index: BM25Index): number {
  let score = 0;
  
  for (const term of queryTerms) {
    const tf = doc.terms.get(term) ?? 0;
    if (tf === 0) {
      continue;
    }
    
    const idf = calculateIDF(term, index);
    const numerator = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + (B * doc.length) / index.averageDocumentLength);
    
    score += idf * (numerator / denominator);
  }
  
  return score;
}

export async function searchByBM25(
  entries: MemoryEntry[],
  query: string,
  options: SearchOptions,
): Promise<SearchResult[]> {
  const limit = options.limit ?? 10;
  const queryTerms = tokenize(query);
  
  if (queryTerms.length === 0) {
    return [];
  }
  
  const index = buildIndex(entries);
  
  if (index.documentCount === 0) {
    return [];
  }
  
  const results: SearchResult[] = [];
  
  for (const entry of entries) {
    const doc = index.documents.get(entry.id);
    if (!doc) {
      continue;
    }
    
    const score = calculateBM25Score(doc, queryTerms, index);
    
    if (score > 0) {
      const highlights = extractHighlights(entry.content, queryTerms);
      results.push({
        entry,
        score,
        highlights,
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function extractHighlights(content: string, queryTerms: string[]): string[] {
  const highlights: string[] = [];
  const contentLower = content.toLowerCase();
  const termSet = new Set(queryTerms.map((t) => t.toLowerCase()));
  
  const sentences = content.split(/[.!?\n]+/);
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const words = tokenize(sentence);
    
    let matchCount = 0;
    for (const word of words) {
      if (termSet.has(word)) {
        matchCount++;
      }
    }
    
    if (matchCount > 0) {
      highlights.push(sentence.trim());
    }
  }
  
  return highlights.slice(0, 3);
}

export class BM25Store {
  private index: BM25Index | null = null;
  
  rebuild(entries: MemoryEntry[]): void {
    this.index = buildIndex(entries);
  }
  
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.index) {
      return [];
    }
    
    const limit = options.limit ?? 10;
    const queryTerms = tokenize(query);
    
    if (queryTerms.length === 0) {
      return [];
    }
    
    const results: SearchResult[] = [];
    
    for (const [id, doc] of this.index.documents) {
      const score = calculateBM25Score(doc, queryTerms, this.index);
      
      if (score > 0) {
        const entry = { id, content: doc.content } as unknown as MemoryEntry;
        const highlights = extractHighlights(doc.content, queryTerms);
        results.push({
          entry,
          score,
          highlights,
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  
  size(): number {
    return this.index?.documentCount ?? 0;
  }
}
