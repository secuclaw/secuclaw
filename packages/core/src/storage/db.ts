import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "./schema/objects.sql.js";

export interface DatabaseConfig {
  path?: string;
  readonly?: boolean;
}

export class DatabaseConnection {
  private sqlite: Database;
  private db: ReturnType<typeof drizzle>;

  constructor(config: DatabaseConfig = {}) {
    const dbPath = config.path ?? join(process.cwd(), "data", "esc.db");
    const dbDir = dirname(dbPath);

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.sqlite = new Database(dbPath, { readonly: config.readonly });
    this.db = drizzle(this.sqlite, { schema });
  }

  getDb(): ReturnType<typeof drizzle> {
    return this.db;
  }

  getRawDb(): Database {
    return this.sqlite;
  }

  close(): void {
    this.sqlite.close();
  }

  transaction<T>(fn: () => T): T {
    return (this.db.transaction(fn) as () => T)();
  }
}

let dbInstance: DatabaseConnection | null = null;

export function initDatabase(config?: DatabaseConfig): DatabaseConnection {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = new DatabaseConnection(config);
  return dbInstance;
}

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return dbInstance;
}

export { schema };
