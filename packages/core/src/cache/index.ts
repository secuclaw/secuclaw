import * as crypto from "node:crypto";

export * from "./api-cache.js";
export { apiCache, createCachedApiHook } from "./api-cache.js";

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, unknown>;
}

export interface CacheConfig {
  maxSize: number;
  ttl: number;
  enableSimilarityMatch: boolean;
  similarityThreshold: number;
  evictionPolicy: "lru" | "lfu" | "ttl";
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 3600000,
  enableSimilarityMatch: true,
  similarityThreshold: 0.85,
  evictionPolicy: "lru",
};

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  similarityHits: number;
}

export interface CachedRequest {
  signature: string;
  prompt: string;
  response: string;
  model: string;
  provider: string;
  tokensUsed: number;
  latency: number;
  createdAt: number;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

export class SmartCache<T = CachedRequest> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
    evictions: 0,
    similarityHits: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats.maxSize = this.config.maxSize;
  }

  generateKey(prompt: string, options?: {
    model?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
  }): string {
    const normalized = prompt.trim().toLowerCase().replace(/\s+/g, " ");
    const hashInput = JSON.stringify({
      prompt: normalized,
      model: options?.model || "default",
      provider: options?.provider || "default",
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 4096,
    });
    
    return crypto.createHash("sha256").update(hashInput).digest("hex").substring(0, 16);
  }

  set(key: string, value: T, ttl?: number, metadata?: Record<string, unknown>): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + (ttl || this.config.ttl),
      accessCount: 0,
      lastAccessed: now,
      metadata,
    };

    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.value;
  }

  findSimilar(prompt: string): { key: string; value: T; similarity: number } | undefined {
    if (!this.config.enableSimilarityMatch) return undefined;

    const normalized = prompt.trim().toLowerCase();
    let bestMatch: { key: string; value: T; similarity: number } | undefined;
    let bestSimilarity = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) continue;

      const cachedPrompt = (entry.value as CachedRequest)?.prompt;
      if (!cachedPrompt) continue;

      const similarity = calculateSimilarity(normalized, cachedPrompt.toLowerCase());
      
      if (similarity >= this.config.similarityThreshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { key, value: entry.value, similarity };
      }
    }

    if (bestMatch) {
      this.stats.hits++;
      this.stats.similarityHits++;
      this.updateHitRate();
      
      const entry = this.cache.get(bestMatch.key);
      if (entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
      }
    } else {
      this.stats.misses++;
      this.updateHitRate();
    }

    return bestMatch;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.hitRate = 0;
    this.stats.evictions = 0;
    this.stats.similarityHits = 0;
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | undefined;

    switch (this.config.evictionPolicy) {
      case "lru": {
        let oldest = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.lastAccessed < oldest) {
            oldest = entry.lastAccessed;
            keyToEvict = key;
          }
        }
        break;
      }
      case "lfu": {
        let lowestFreq = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.accessCount < lowestFreq) {
            lowestFreq = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;
      }
      case "ttl": {
        let earliest = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.expiresAt < earliest) {
            earliest = entry.expiresAt;
            keyToEvict = key;
          }
        }
        break;
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats, size: this.cache.size };
  }

  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.stats.size = this.cache.size;
    return cleaned;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }
}

export const createSmartCache = <T>(config?: Partial<CacheConfig>) =>
  new SmartCache<T>(config);
