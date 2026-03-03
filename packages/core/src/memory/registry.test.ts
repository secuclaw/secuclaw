import { describe, expect, it } from "vitest";
import { MemoryRegistry } from "./registry.js";
import type { IMemoryStore } from "./trait.js";

const mockStore: IMemoryStore = {
  id: "memory-1",
  name: "memory-1",
  capabilities: {
    vectorSearch: false,
    keywordSearch: true,
    hybridSearch: true,
    persistence: false,
    embeddings: false,
    compaction: true,
    maxEntries: 100,
    maxStorageMb: 10,
  },
  async initialize() {},
  async dispose() {},
  async store(entry) { return entry.id; },
  async storeBatch(entries) { return entries.map((e) => e.id); },
  async retrieve() { return null; },
  async search() { return { items: [], total: 0 }; },
  async vectorSearch() { return { items: [], total: 0 }; },
  async keywordSearch() { return { items: [], total: 0 }; },
  async hybridSearch() { return { items: [], total: 0 }; },
  async update() {},
  async delete() {},
  async deleteBySession() {},
  async compact() { return { removed: 0, before: 0, after: 0 }; },
  async stats() { return { entries: 0, approxStorageMb: 0 }; },
  async clear() {},
};

describe("memory registry", () => {
  it("registers memory store", () => {
    const registry = new MemoryRegistry();
    registry.register(mockStore);

    expect(registry.get("memory-1")).toBeDefined();
    expect(registry.getByCapability("keywordSearch")).toHaveLength(1);
  });
});
