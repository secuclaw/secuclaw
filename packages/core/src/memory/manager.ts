import type {
  MemoryEntry,
  MemoryMetadata,
  SearchOptions,
  SearchResult,
  MemoryStoreConfig,
  MemoryIndexConfig,
} from "./types.js";
import { DEFAULT_MEMORY_STORE_CONFIG, DEFAULT_MEMORY_INDEX_CONFIG } from "./types.js";
import { HybridSearch } from "./hybrid.js";
import * as crypto from "node:crypto";

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString("hex");
  return `${timestamp}-${randomPart}`;
}
  MemoryEntry,
  MemoryMetadata,
  SearchOptions,
  SearchResult,
  MemoryStoreConfig,
  MemoryIndexConfig,
} from "./types.js";
import { DEFAULT_MEMORY_STORE_CONFIG, DEFAULT_MEMORY_INDEX_CONFIG } from "./types.js";
import { HybridSearch } from "./hybrid.js";

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

function filterEntries(entries: MemoryEntry[], options: SearchOptions): MemoryEntry[] {
  return entries.filter((entry) => {
    if (options.sources && options.sources.length > 0) {
      if (!options.sources.includes(entry.metadata.source)) {
        return false;
      }
    }
    
    if (options.tags && options.tags.length > 0) {
      const hasTag = options.tags.some((tag) => entry.metadata.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }
    
    if (options.minImportance !== undefined) {
      if (entry.metadata.importance < options.minImportance) {
        return false;
      }
    }
    
    if (options.sessionId) {
      if (entry.metadata.sessionId !== options.sessionId) {
        return false;
      }
    }
    
    if (options.incidentId) {
      if (entry.metadata.incidentId !== options.incidentId) {
        return false;
      }
    }
    
    if (options.since !== undefined) {
      if (entry.metadata.timestamp < options.since) {
        return false;
      }
    }
    
    if (options.until !== undefined) {
      if (entry.metadata.timestamp > options.until) {
        return false;
      }
    }
    
    return true;
  });
}

export class MemoryManager {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: MemoryStoreConfig;
  private hybridSearch: HybridSearch;
  
  constructor(config: Partial<MemoryStoreConfig> & { dataDir: string }) {
    this.config = {
      ...DEFAULT_MEMORY_STORE_CONFIG,
      ...config,
      indexConfig: {
        ...DEFAULT_MEMORY_INDEX_CONFIG,
        ...config.indexConfig,
      },
    };
    this.hybridSearch = new HybridSearch(this.config.indexConfig);
  }
  
  async add(
    content: string,
    metadata: Omit<MemoryMetadata, "timestamp">,
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: generateId(),
      content,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
      },
    };
    
    this.entries.set(entry.id, entry);
    await this.hybridSearch.index(Array.from(this.entries.values()));
    
    return entry;
  }
  
  async addBatch(
    items: Array<{ content: string; metadata: Omit<MemoryMetadata, "timestamp"> }>,
  ): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = items.map((item) => ({
      id: generateId(),
      content: item.content,
      metadata: {
        ...item.metadata,
        timestamp: Date.now(),
      },
    }));
    
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
    
    await this.hybridSearch.index(Array.from(this.entries.values()));
    
    return entries;
  }
  
  async search(options: SearchOptions): Promise<SearchResult[]> {
    let entries = Array.from(this.entries.values());
    
    entries = filterEntries(entries, options);
    
    const searchOptions: SearchOptions = {
      ...options,
      query: options.query,
      limit: options.limit ?? 10,
    };
    
    return this.hybridSearch.search(searchOptions.query, searchOptions);
  }
  
  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id);
  }
  
  getBySession(sessionId: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.metadata.sessionId === sessionId,
    );
  }
  
  getByIncident(incidentId: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.metadata.incidentId === incidentId,
    );
  }
  
  getBySource(source: string): MemoryEntry[] {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.metadata.source === source,
    );
  }
  
  async update(id: string, updates: { content?: string; metadata?: Partial<MemoryMetadata> }): Promise<MemoryEntry | null> {
    const existing = this.entries.get(id);
    if (!existing) {
      return null;
    }
    
    const updated: MemoryEntry = {
      ...existing,
      content: updates.content ?? existing.content,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
      },
    };
    
    this.entries.set(id, updated);
    await this.hybridSearch.index(Array.from(this.entries.values()));
    
    return updated;
  }
  
  async delete(id: string): Promise<boolean> {
    const deleted = this.entries.delete(id);
    if (deleted) {
      await this.hybridSearch.index(Array.from(this.entries.values()));
    }
    return deleted;
  }
  
  async pruneExpired(): Promise<number> {
    const now = Date.now();
    let pruned = 0;
    
    for (const [id, entry] of this.entries) {
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
        this.entries.delete(id);
        pruned++;
      }
    }
    
    if (pruned > 0) {
      await this.hybridSearch.index(Array.from(this.entries.values()));
    }
    
    return pruned;
  }
  
  async pruneStale(): Promise<number> {
    const cutoff = Date.now() - this.config.pruneAfterMs;
    let pruned = 0;
    
    for (const [id, entry] of this.entries) {
      if (entry.metadata.timestamp < cutoff) {
        this.entries.delete(id);
        pruned++;
      }
    }
    
    if (pruned > 0) {
      await this.hybridSearch.index(Array.from(this.entries.values()));
    }
    
    return pruned;
  }
  
  clear(): void {
    this.entries.clear();
    this.hybridSearch.clear();
  }
  
  size(): number {
    return this.entries.size;
  }
  
  getConfig(): MemoryStoreConfig {
    return { ...this.config };
  }
  
  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }
  
  async rebuildIndex(): Promise<void> {
    await this.hybridSearch.index(Array.from(this.entries.values()));
  }
}

let memoryManagerInstance: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager({ dataDir: './data/memory' });
  }
  return memoryManagerInstance;
}

export function resetMemoryManager(): void {
  memoryManagerInstance = null;
}
