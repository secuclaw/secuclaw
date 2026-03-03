export type ThreatIntelSource = "misp" | "otx" | "virustotal" | "hybrid" | "local" | "taxii";

export type IoCType = 
  | "ip" 
  | "domain" 
  | "url" 
  | "hash_md5" 
  | "hash_sha1" 
  | "hash_sha256" 
  | "email" 
  | "cve";

export interface IoC {
  type: IoCType;
  value: string;
  confidence?: number;
  firstSeen?: Date;
  lastSeen?: Date;
  tags?: string[];
}

export interface ThreatIntelResult {
  source: ThreatIntelSource;
  ioc: IoC;
  malicious: boolean;
  confidence: number;
  tags: string[];
  threatTypes: string[];
  malwareFamilies: string[];
  campaigns: string[];
  actors: string[];
  references: Array<{
    title: string;
    url: string;
  }>;
  raw?: Record<string, unknown>;
  fetchedAt: Date;
}

export interface ThreatIntelConnector {
  readonly name: ThreatIntelSource;
  readonly enabled: boolean;
  query(ioc: IoC): Promise<ThreatIntelResult>;
  ping(): Promise<boolean>;
}

export interface MISPConfig {
  baseUrl: string;
  apiKey: string;
  verifySSL?: boolean;
  timeout?: number;
}

export interface OTXConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ThreatIntelManagerConfig {
  connectors?: Partial<{
    misp: MISPConfig;
    otx: OTXConfig;
  }>;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  parallelQueries?: boolean;
}
