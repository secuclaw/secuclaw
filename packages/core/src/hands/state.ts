/**
 * Hand Framework - State Management
 * 
 * Defines state types and state manager for Hand instances.
 */

import type { HandStatus } from "./types.js";

// Hand runtime state
export interface HandState {
  instanceId: string;
  status: HandStatus;
  progress: number;
  lastError?: Error;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  successCount: number;
  errorCount: number;
  metadata: Record<string, unknown>;
}

// Create initial state for a Hand instance
export function createInitialState(instanceId: string): HandState {
  return {
    instanceId,
    status: "idle",
    progress: 0,
    runCount: 0,
    successCount: 0,
    errorCount: 0,
    metadata: {},
  };
}

// State manager for Hand instances with in-memory and SQLite persistence
export class HandStateManager {
  private states = new Map<string, HandState>();
  private storageAdapter?: StateStorageAdapter;

  constructor(storageAdapter?: StateStorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  getState(instanceId: string): HandState | undefined {
    return this.states.get(instanceId);
  }

  setState(instanceId: string, state: Partial<HandState>): void {
    const current = this.states.get(instanceId) ?? createInitialState(instanceId);
    this.states.set(instanceId, { ...current, ...state });
  }

  async persistState(instanceId: string): Promise<void> {
    const state = this.states.get(instanceId);
    if (!state) {
      return;
    }

    if (this.storageAdapter) {
      await this.storageAdapter.save(instanceId, state);
    }
  }

  async loadState(instanceId: string): Promise<HandState | undefined> {
    // First check in-memory
    const cached = this.states.get(instanceId);
    if (cached) {
      return cached;
    }

    // Load from storage if available
    if (this.storageAdapter) {
      const loaded = await this.storageAdapter.load(instanceId);
      if (loaded) {
        this.states.set(instanceId, loaded);
        return loaded;
      }
    }

    return undefined;
  }

  deleteState(instanceId: string): void {
    this.states.delete(instanceId);
  }

  listInstanceIds(): string[] {
    return Array.from(this.states.keys());
  }

  setStorageAdapter(adapter: StateStorageAdapter): void {
    this.storageAdapter = adapter;
  }
}

// Storage adapter interface for persistence
export interface StateStorageAdapter {
  save(instanceId: string, state: HandState): Promise<void>;
  load(instanceId: string): Promise<HandState | null>;
  delete(instanceId: string): Promise<void>;
  list(): Promise<string[]>;
}

// SQLite-based storage adapter
export class SQLiteStateStorageAdapter implements StateStorageAdapter {
  private db: unknown;
  private tableName: string;

  constructor(db: unknown, tableName = "hand_states") {
    this.db = db;
    this.tableName = tableName;
  }

  async save(instanceId: string, state: HandState): Promise<void> {
    // SQLite save implementation would go here
    // Using dynamic import to avoid issues when SQLite is not available
    const { default: Database } = await import("bun:sqlite");
    if (typeof this.db === "string") {
      const db = new Database(this.db);
      db.prepare(
        `INSERT OR REPLACE INTO ${this.tableName} (instance_id, state_json, updated_at) VALUES (?, ?, ?)`
      ).run(instanceId, JSON.stringify(state), Date.now());
    }
  }

  async load(instanceId: string): Promise<HandState | null> {
    const { default: Database } = await import("bun:sqlite");
    if (typeof this.db === "string") {
      const db = new Database(this.db);
      const row = db.prepare(
        `SELECT state_json FROM ${this.tableName} WHERE instance_id = ?`
      ).get(instanceId) as { state_json: string } | undefined;
      if (row) {
        return JSON.parse(row.state_json) as HandState;
      }
    }
    return null;
  }

  async delete(instanceId: string): Promise<void> {
    const { default: Database } = await import("bun:sqlite");
    if (typeof this.db === "string") {
      const db = new Database(this.db);
      db.prepare(`DELETE FROM ${this.tableName} WHERE instance_id = ?`).run(instanceId);
    }
  }

  async list(): Promise<string[]> {
    const { default: Database } = await import("bun:sqlite");
    if (typeof this.db === "string") {
      const db = new Database(this.db);
      const rows = db.prepare(`SELECT instance_id FROM ${this.tableName}`).all() as Array<{ instance_id: string }>;
      return rows.map((r) => r.instance_id);
    }
    return [];
  }
}
