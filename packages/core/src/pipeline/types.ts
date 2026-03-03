export type DataSourceType =
  | "syslog"
  | "netflow"
  | "firewall"
  | "ids"
  | "waf"
  | "edr"
  | "siem"
  | "vulnerability_scanner"
  | "asset_inventory"
  | "threat_intelligence"
  | "cloud_audit"
  | "custom";

export type DataFormat = "json" | "csv" | "syslog" | "cef" | "protobuf" | "xml";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  format: DataFormat;
  endpoint: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastSync?: number;
  status: "connected" | "disconnected" | "error";
  errorCount: number;
}

export interface RawDataEvent {
  id: string;
  sourceId: string;
  timestamp: number;
  rawData: unknown;
  format: DataFormat;
  metadata: Record<string, unknown>;
}

export interface NormalizedEvent {
  id: string;
  correlationId: string;
  timestamp: number;
  sourceId: string;
  sourceType: DataSourceType;
  eventType: string;
  severity: Severity;
  title: string;
  description: string;
  srcIp?: string;
  srcPort?: number;
  dstIp?: string;
  dstPort?: number;
  protocol?: string;
  hostname?: string;
  username?: string;
  processName?: string;
  filePath?: string;
  hash?: string;
  url?: string;
  userAgent?: string;
  tags: string[];
  mitreTactics?: string[];
  mitreTechniques?: string[];
  rawEvent: unknown;
  enrichedData: Record<string, unknown>;
}

export interface ThreatIntelligence {
  id: string;
  type: "ip" | "domain" | "url" | "hash" | "email" | "cve";
  value: string;
  confidence: number;
  threatType: string;
  threatActor?: string;
  firstSeen: number;
  lastSeen: number;
  sources: string[];
  mitreTactics?: string[];
  mitreTechniques?: string[];
  tags: string[];
}

export interface AssetInfo {
  id: string;
  hostname?: string;
  ipAddresses: string[];
  macAddress?: string;
  osType?: string;
  osVersion?: string;
  assetType: "server" | "workstation" | "network" | "cloud" | "container" | "iot";
  criticality: "critical" | "high" | "medium" | "low";
  location?: string;
  owner?: string;
  tags: string[];
  vulnerabilities: string[];
  lastSeen: number;
}

export interface VulnerabilityInfo {
  id: string;
  cve?: string;
  name: string;
  description: string;
  severity: Severity;
  cvssScore?: number;
  affectedAssets: string[];
  exploitAvailable: boolean;
  patchAvailable: boolean;
  publishedDate: number;
  lastModified: number;
  mitreTechniques?: string[];
}

export interface DataFusionResult {
  eventId: string;
  correlationScore: number;
  relatedEvents: string[];
  entities: {
    type: "ip" | "host" | "user" | "process" | "file";
    value: string;
    confidence: number;
  }[];
  timeline: Array<{
    timestamp: number;
    event: string;
    description: string;
  }>;
  riskScore: number;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface PipelineStats {
  totalEvents: number;
  eventsPerSecond: number;
  eventsBySource: Map<string, number>;
  eventsByType: Map<string, number>;
  avgProcessingTime: number;
  errorCount: number;
  lastError?: string;
  queueSize: number;
}

export interface PipelineConfig {
  maxQueueSize: number;
  batchSize: number;
  flushInterval: number;
  enableEnrichment: boolean;
  enableCorrelation: boolean;
  enableThreatIntel: boolean;
  retentionHours: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxQueueSize: 100000,
  batchSize: 1000,
  flushInterval: 5000,
  enableEnrichment: true,
  enableCorrelation: true,
  enableThreatIntel: true,
  retentionHours: 168,
};
