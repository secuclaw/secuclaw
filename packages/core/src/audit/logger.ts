import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export type AuditEventType =
  | "session.create"
  | "session.message"
  | "session.delete"
  | "tool.execute"
  | "tool.complete"
  | "sandbox.start"
  | "sandbox.complete"
  | "config.change"
  | "skill.load"
  | "skill.invoke"
  | "agent.plan"
  | "agent.execute"
  | "reasoning.query"
  | "reasoning.result"
  | "api.request"
  | "api.response"
  | "auth.login"
  | "auth.logout"
  | "data.access"
  | "data.export";

export type AuditSeverity = "info" | "warn" | "error" | "critical";

export interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  source: string;
  action: string;
  resource?: string;
  details: Record<string, unknown>;
  result: "success" | "failure" | "partial";
  errorMessage?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
  hash?: string;
  prevHash?: string;
}

export interface AuditConfig {
  enabled: boolean;
  logDir: string;
  maxFileSize: number;
  maxFiles: number;
  includeSensitive: boolean;
  hashChain: boolean;
}

const DEFAULT_CONFIG: AuditConfig = {
  enabled: true,
  logDir: "./data/audit",
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 30,
  includeSensitive: false,
  hashChain: true,
};

class AuditLogger {
  private config: AuditConfig;
  private currentFile: string | null = null;
  private currentSize: number = 0;
  private lastHash: string = "";
  private buffer: AuditEntry[] = [];
  private flushInterval: unknown = null;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  private init(): void {
    if (!this.config.enabled) return;

    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }

    this.rotateIfNeeded();
    
    this.flushInterval = setInterval(() => this.flush(), 5000);
    if (typeof this.flushInterval === "object" && "unref" in (this.flushInterval as object)) {
      (this.flushInterval as { unref: () => void }).unref();
    }
  }

  private rotateIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `audit-${today}.jsonl`;
    const filepath = path.join(this.config.logDir, filename);

    if (this.currentFile !== filepath) {
      this.currentFile = filepath;
      this.currentSize = 0;

      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        this.currentSize = stats.size;
        
        const lastLine = this.getLastLine(filepath);
        if (lastLine) {
          try {
            const entry = JSON.parse(lastLine);
            this.lastHash = entry.hash || "";
          } catch {}
        }
      }

      this.cleanOldFiles();
    }
  }

  private getLastLine(filepath: string): string | null {
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      const lines = content.trim().split("\n");
      return lines.length > 0 ? lines[lines.length - 1] : null;
    } catch {
      return null;
    }
  }

  private cleanOldFiles(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter((f) => f.startsWith("audit-") && f.endsWith(".jsonl"))
        .sort()
        .reverse();

      while (files.length > this.config.maxFiles) {
        const oldFile = files.pop();
        if (oldFile) {
          fs.unlinkSync(path.join(this.config.logDir, oldFile));
        }
      }
    } catch {}
  }

  private generateHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      prevHash: this.lastHash,
    });
    return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    if (this.config.includeSensitive) return details;

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ["password", "token", "secret", "key", "credential", "api_key", "apikey"];

    for (const [key, value] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  log(
    eventType: AuditEventType,
    action: string,
    details: Record<string, unknown>,
    options: {
      severity?: AuditSeverity;
      sessionId?: string;
      userId?: string;
      tenantId?: string;
      source?: string;
      resource?: string;
      result?: "success" | "failure" | "partial";
      errorMessage?: string;
      duration?: number;
      ip?: string;
      userAgent?: string;
    } = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      eventType,
      severity: options.severity || "info",
      sessionId: options.sessionId,
      userId: options.userId,
      tenantId: options.tenantId,
      source: options.source || "system",
      action,
      resource: options.resource,
      details: this.sanitizeDetails(details),
      result: options.result || "success",
      errorMessage: options.errorMessage,
      duration: options.duration,
      ip: options.ip,
      userAgent: options.userAgent,
    };

    if (this.config.hashChain) {
      entry.prevHash = this.lastHash || undefined;
      entry.hash = this.generateHash(entry);
      this.lastHash = entry.hash;
    }

    this.buffer.push(entry);
    
    if (this.buffer.length >= 100) {
      this.flush();
    }

    return entry;
  }

  private flush(): void {
    if (this.buffer.length === 0 || !this.currentFile) return;

    this.rotateIfNeeded();

    const lines = this.buffer.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const size = Buffer.byteLength(lines);

    if (this.currentSize + size > this.config.maxFileSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const newFilename = `audit-${new Date().toISOString().slice(0, 10)}-${timestamp}.jsonl`;
      this.currentFile = path.join(this.config.logDir, newFilename);
      this.currentSize = 0;
    }

    fs.appendFileSync(this.currentFile, lines);
    this.currentSize += size;
    this.buffer = [];
  }

  query(filter: {
    eventType?: AuditEventType;
    sessionId?: string;
    userId?: string;
    startTime?: string;
    endTime?: string;
    severity?: AuditSeverity;
    limit?: number;
  }): AuditEntry[] {
    this.flush();

    const results: AuditEntry[] = [];
    const files = fs.readdirSync(this.config.logDir)
      .filter((f) => f.startsWith("audit-") && f.endsWith(".jsonl"))
      .sort()
      .reverse();

    for (const file of files) {
      if (filter.limit && results.length >= filter.limit) break;

      const content = fs.readFileSync(path.join(this.config.logDir, file), "utf-8");
      const lines = content.trim().split("\n");

      for (const line of lines.reverse()) {
        if (filter.limit && results.length >= filter.limit) break;

        try {
          const entry = JSON.parse(line) as AuditEntry;

          if (filter.eventType && entry.eventType !== filter.eventType) continue;
          if (filter.sessionId && entry.sessionId !== filter.sessionId) continue;
          if (filter.userId && entry.userId !== filter.userId) continue;
          if (filter.severity && entry.severity !== filter.severity) continue;
          if (filter.startTime && entry.timestamp < filter.startTime) continue;
          if (filter.endTime && entry.timestamp > filter.endTime) continue;

          results.push(entry);
        } catch {}
      }
    }

    return results;
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval as unknown as number);
    }
    this.flush();
  }
}

export const auditLogger = new AuditLogger();

export function auditLog(
  eventType: AuditEventType,
  action: string,
  details: Record<string, unknown>,
  options?: Parameters<AuditLogger["log"]>[3]
): AuditEntry {
  return auditLogger.log(eventType, action, details, options);
}

export function queryAuditLog(filter: Parameters<AuditLogger["query"]>[0]): AuditEntry[] {
  return auditLogger.query(filter);
}
