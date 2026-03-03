import type {
  DataSource,
  RawDataEvent,
  NormalizedEvent,
  DataSourceType,
  DataFormat,
  Severity,
} from "./types.js";

export interface DataConnector {
  source: DataSource;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  fetch(since?: number): Promise<RawDataEvent[]>;
  subscribe(callback: (event: RawDataEvent) => void): void;
  unsubscribe(): void;
  isConnected(): boolean;
}

export abstract class BaseConnector implements DataConnector {
  source: DataSource;
  protected callback?: (event: RawDataEvent) => void;
  protected connected = false;

  constructor(source: DataSource) {
    this.source = source;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract fetch(since?: number): Promise<RawDataEvent[]>;

  subscribe(callback: (event: RawDataEvent) => void): void {
    this.callback = callback;
  }

  unsubscribe(): void {
    this.callback = undefined;
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected emit(event: RawDataEvent): void {
    if (this.callback) {
      this.callback(event);
    }
  }

  protected generateId(): string {
    return `${this.source.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class SyslogConnector extends BaseConnector {
  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async fetch(since?: number): Promise<RawDataEvent[]> {
    return [];
  }

  parseSyslogLine(line: string): RawDataEvent {
    const timestampMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
    const hostMatch = line.match(/^\w+\s+\d+\s+\d+:\d+:\d+\s+(\S+)/);
    const programMatch = line.match(/^\S+\s+(\w+)(?:\[\d+\])?:/);

    return {
      id: this.generateId(),
      sourceId: this.source.id,
      timestamp: Date.now(),
      rawData: {
        raw: line,
        timestamp: timestampMatch?.[1],
        host: hostMatch?.[1],
        program: programMatch?.[1],
        message: line.substring(line.indexOf(":") + 1).trim(),
      },
      format: "syslog" as DataFormat,
      metadata: {},
    };
  }
}

export class JsonApiConnector extends BaseConnector {
  private lastFetch = 0;

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(this.source.endpoint, {
        method: "HEAD",
        headers: this.source.config.headers as Record<string, string>,
      });
      this.connected = response.ok;
      return this.connected;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async fetch(since?: number): Promise<RawDataEvent[]> {
    if (!this.connected) {
      return [];
    }

    try {
      const url = new URL(this.source.endpoint);
      if (since) {
        url.searchParams.set("since", since.toString());
      }

      const response = await fetch(url.toString(), {
        headers: this.source.config.headers as Record<string, string>,
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as unknown;
      const events: RawDataEvent[] = [];
      const itemsArray = Array.isArray(data) ? data : (data as Record<string, unknown>)?.events || [data];
      const items = Array.isArray(itemsArray) ? itemsArray : [data] as unknown[];

      for (const item of items) {
        events.push({
          id: this.generateId(),
          sourceId: this.source.id,
          timestamp: item.timestamp || item["@timestamp"] || Date.now(),
          rawData: item,
          format: "json" as DataFormat,
          metadata: {},
        });
      }

      this.lastFetch = Date.now();
      return events;
    } catch {
      return [];
    }
  }
}

export class VulnerabilityConnector extends BaseConnector {
  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async fetch(since?: number): Promise<RawDataEvent[]> {
    return [];
  }

  parseNessusResult(result: Record<string, unknown>): RawDataEvent {
    return {
      id: this.generateId(),
      sourceId: this.source.id,
      timestamp: (result["@timestamp"] as number) || Date.now(),
      rawData: result,
      format: "json" as DataFormat,
      metadata: {
        scanId: result["scan_id"],
        pluginId: result["plugin_id"],
        severity: result["severity"],
      },
    };
  }
}

export class ThreatIntelConnector extends BaseConnector {
  private feeds: Map<string, unknown[]> = new Map();

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.feeds.clear();
  }

  async fetch(since?: number): Promise<RawDataEvent[]> {
    const events: RawDataEvent[] = [];

    for (const [feedName, indicators] of this.feeds) {
      for (const indicator of indicators) {
        events.push({
          id: this.generateId(),
          sourceId: this.source.id,
          timestamp: Date.now(),
          rawData: {
            feed: feedName,
            indicator,
          },
          format: "json" as DataFormat,
          metadata: { feedName },
        });
      }
    }

    return events;
  }

  addFeed(name: string, indicators: unknown[]): void {
    this.feeds.set(name, indicators);
  }
}

export class CloudAuditConnector extends BaseConnector {
  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async fetch(since?: number): Promise<RawDataEvent[]> {
    return [];
  }

  parseAwsCloudTrail(event: Record<string, unknown>): RawDataEvent {
    const detail = event.detail as Record<string, unknown>;
    return {
      id: this.generateId(),
      sourceId: this.source.id,
      timestamp: (event.time as number) || Date.now(),
      rawData: event,
      format: "json" as DataFormat,
      metadata: {
        eventName: detail?.eventName,
        eventSource: detail?.eventSource,
        userIdentity: detail?.userIdentity,
      },
    };
  }
}

export function createConnector(source: DataSource): DataConnector {
  switch (source.type) {
    case "syslog":
      return new SyslogConnector(source);
    case "siem":
    case "custom":
      return new JsonApiConnector(source);
    case "vulnerability_scanner":
      return new VulnerabilityConnector(source);
    case "threat_intelligence":
      return new ThreatIntelConnector(source);
    case "cloud_audit":
      return new CloudAuditConnector(source);
    default:
      return new JsonApiConnector(source);
  }
}

export const SEVERITY_MAP: Record<string, Severity> = {
  "0": "info",
  "1": "low",
  "2": "medium",
  "3": "high",
  "4": "critical",
  "informational": "info",
  "low": "low",
  "medium": "medium",
  "high": "high",
  "critical": "critical",
  "error": "high",
  "warning": "medium",
  "notice": "low",
  "debug": "info",
};

export function normalizeEvent(event: RawDataEvent): NormalizedEvent {
  const raw = event.rawData as Record<string, unknown>;

  const severity = determineSeverity(raw);

  return {
    id: event.id,
    correlationId: event.id,
    timestamp: event.timestamp,
    sourceId: event.sourceId,
    sourceType: "custom" as DataSourceType,
    eventType: (raw.event_type as string) || (raw.type as string) || "unknown",
    severity,
    title: extractTitle(raw),
    description: extractDescription(raw),
    srcIp: extractIp(raw, ["src_ip", "source_ip", "srcIp", "sourceIp", "source.ip"]),
    srcPort: extractPort(raw, ["src_port", "source_port", "srcPort", "sourcePort"]),
    dstIp: extractIp(raw, ["dst_ip", "dest_ip", "destination_ip", "dstIp", "destIp"]),
    dstPort: extractPort(raw, ["dst_port", "dest_port", "destination_port", "dstPort", "destPort"]),
    protocol: (raw.protocol as string) || (raw.proto as string),
    hostname: (raw.hostname as string) || (raw.host as string) || (raw.src_host as string),
    username: (raw.username as string) || (raw.user as string) || (raw.user_name as string),
    processName: (raw.process as string) || (raw.process_name as string),
    filePath: (raw.file as string) || (raw.file_path as string) || (raw.path as string),
    hash: (raw.hash as string) || (raw.md5 as string) || (raw.sha256 as string),
    url: (raw.url as string) || (raw.uri as string),
    userAgent: (raw.user_agent as string) || (raw.userAgent as string),
    tags: extractTags(raw),
    mitreTactics: (raw.mitre_tactics as string[]) || [],
    mitreTechniques: (raw.mitre_techniques as string[]) || [],
    rawEvent: event.rawData,
    enrichedData: {},
  };
}

function determineSeverity(raw: Record<string, unknown>): Severity {
  const sev = raw.severity || raw.level || raw.priority;
  if (typeof sev === "string") {
    return SEVERITY_MAP[sev.toLowerCase()] || "info";
  }
  if (typeof sev === "number") {
    if (sev >= 4) return "critical";
    if (sev >= 3) return "high";
    if (sev >= 2) return "medium";
    if (sev >= 1) return "low";
  }
  return "info";
}

function extractTitle(raw: Record<string, unknown>): string {
  return (
    (raw.title as string) ||
    (raw.name as string) ||
    (raw.event_name as string) ||
    (raw.message as string)?.substring(0, 100) ||
    "Unknown Event"
  );
}

function extractDescription(raw: Record<string, unknown>): string {
  return (
    (raw.description as string) ||
    (raw.detail as string) ||
    (raw.message as string) ||
    ""
  );
}

function extractIp(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && /^\d+\.\d+\.\d+\.\d+/.test(value)) {
      return value;
    }
  }
  return undefined;
}

function extractPort(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && value > 0 && value <= 65535) {
      return value;
    }
  }
  return undefined;
}

function extractTags(raw: Record<string, unknown>): string[] {
  const tags: string[] = [];
  if (raw.tags && Array.isArray(raw.tags)) {
    tags.push(...raw.tags.filter((t: unknown): t is string => typeof t === "string"));
  }
  if (raw.category) {
    tags.push(String(raw.category));
  }
  if (raw.event_type) {
    tags.push(String(raw.event_type));
  }
  return [...new Set(tags)];
}
