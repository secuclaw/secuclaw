export type IOCType = 
  | 'ip' 
  | 'domain' 
  | 'url' 
  | 'hash' 
  | 'email' 
  | 'cve'
  | 'certificate'
  | 'file';

export type HashType = 'md5' | 'sha1' | 'sha256' | 'sha512' | 'ssdeep';

export type ThreatCategory = 
  | 'malware'
  | 'ransomware'
  | 'phishing'
  | 'spam'
  | 'botnet'
  | 'c2'
  | 'apt'
  | 'cryptojacking'
  | 'ddos'
  | 'fraud'
  | 'scam'
  | 'proxy'
  | 'tor'
  | 'scanning'
  | 'exploit'
  | 'unknown';

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean';

export type ProviderName = 
  | 'virustotal'
  | 'otx'
  | 'abuseipdb'
  | 'ibm-xforce'
  | 'threatconnect'
  | 'urlhaus'
  | 'hybrid-analysis'
  | 'joe-sandbox'
  | 'shodan'
  | 'censys'
  | 'ipqualityscore'
  | 'greynoise'
  | 'weibud'
  | 'qianxin'
  | 'anheng'
  | 'nsfocus'
  | 'sangfor'
  | 'custom';

export interface ThreatIntelConfig {
  provider: ProviderName;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  enabled: boolean;
  priority: number;
  timeout?: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  cacheTTL?: number;
}

export interface IOCInput {
  type: IOCType;
  value: string;
  hashType?: HashType;
}

export interface IOCResult {
  ioc: IOCInput;
  provider: ProviderName;
  retrievedAt: Date;
  cached: boolean;
  
  detected: boolean;
  malicious: boolean;
  
  severity: ThreatSeverity;
  confidence: number;
  categories: ThreatCategory[];
  
  reputation?: {
    score: number;
    votes: { malicious: number; benign: number };
  };
  
  tags: string[];
  malwareFamilies?: string[];
  threatActors?: string[];
  campaigns?: string[];
  
  firstSeen?: Date;
  lastSeen?: Date;
  
  asn?: {
    number: number;
    name: string;
    country: string;
  };
  
  geo?: {
    country: string;
    countryCode: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  
  network?: {
    ports?: number[];
    protocols?: string[];
    services?: string[];
    domains?: string[];
    reverseDns?: string;
  };
  
  relationships?: {
    resolvesTo?: string[];
    communicatesWith?: string[];
    downloadedFrom?: string[];
    downloads?: string[];
    similar?: string[];
    related?: string[];
  };
  
  raw?: Record<string, unknown>;
  error?: string;
}

export interface IPReputationResult extends IOCResult {
  ioc: IOCInput & { type: 'ip' };
  abuseConfidenceScore?: number;
  isProxy?: boolean;
  isTor?: boolean;
  isVpn?: boolean;
  isCloudProvider?: boolean;
  isDataCenter?: boolean;
  isResidential?: boolean;
  isMobile?: boolean;
  isp?: string;
  organization?: string;
  openPorts?: number[];
  vulnerabilities?: string[];
}

export interface DomainReputationResult extends IOCResult {
  ioc: IOCInput & { type: 'domain' };
  whois?: {
    registrar?: string;
    createdAt?: Date;
    expiresAt?: Date;
    updatedAt?: Date;
    registrant?: string;
    nameservers?: string[];
    dnssec?: boolean;
    status?: string[];
  };
  dns?: {
    a?: string[];
    aaaa?: string[];
    mx?: string[];
    ns?: string[];
    txt?: string[];
    soa?: string;
  };
  ssl?: {
    issuer?: string;
    validFrom?: Date;
    validTo?: Date;
    subject?: string;
    fingerprints?: Partial<Record<HashType, string>>;
  };
  redirectTo?: string[];
  webCategories?: string[];
}

export interface URLReputationResult extends IOCResult {
  ioc: IOCInput & { type: 'url' };
  finalUrl?: string;
  redirects?: string[];
  statusCode?: number;
  pageTitle?: string;
  webCategories?: string[];
  ssl?: {
    valid: boolean;
    issuer?: string;
    expiresAt?: Date;
  };
}

export interface HashReputationResult extends IOCResult {
  ioc: IOCInput & { type: 'hash' };
  fileInfo?: {
    name?: string;
    size?: number;
    type?: string;
    mimeType?: string;
  };
  signatures?: Array<{
    engine: string;
    result: string;
    category?: string;
  }>;
  behavior?: {
    processes?: string[];
    network?: string[];
    files?: string[];
    registry?: string[];
  };
  yaraMatches?: string[];
  mitreAttack?: Array<{
    tactic: string;
    technique: string;
  }>;
}

export interface CVEResult extends IOCResult {
  ioc: IOCInput & { type: 'cve' };
  cvss?: {
    version: string;
    baseScore: number;
    severity: string;
    vector: string;
  };
  cwe?: string[];
  affectedProducts?: Array<{
    vendor: string;
    product: string;
    versions: string[];
  }>;
  exploits?: Array<{
    source: string;
    url: string;
    maturity?: string;
  }>;
  patches?: Array<{
    vendor: string;
    url: string;
  }>;
  references?: Array<{
    source: string;
    url: string;
    tags?: string[];
  }>;
}

export type ThreatIntelResult = 
  | IOCResult 
  | IPReputationResult 
  | DomainReputationResult 
  | URLReputationResult 
  | HashReputationResult 
  | CVEResult;

export interface AggregatedResult {
  ioc: IOCInput;
  aggregatedAt: Date;
  
  consensus: {
    detected: boolean;
    malicious: boolean;
    severity: ThreatSeverity;
    confidence: number;
    agreement: number;
  };
  
  categories: Array<{
    category: ThreatCategory;
    count: number;
    providers: ProviderName[];
  }>;
  
  tags: Array<{
    tag: string;
    count: number;
    providers: ProviderName[];
  }>;
  
  reputation: {
    averageScore: number;
    weightedScore: number;
    totalVotes: { malicious: number; benign: number };
  };
  
  firstSeenGlobally?: Date;
  lastSeenGlobally?: Date;
  
  providerResults: Map<ProviderName, ThreatIntelResult>;
  
  correlations?: {
    relatedIOCs: IOCInput[];
    commonInfrastructure: string[];
    threatCampaigns: string[];
  };
  
  recommendations?: Array<{
    action: 'block' | 'monitor' | 'investigate' | 'allow';
    reason: string;
    confidence: number;
  }>;
}

export interface ThreatIntelProvider {
  name: ProviderName;
  config: ThreatIntelConfig;
  
  initialize(): Promise<void>;
  
  queryIP(ip: string): Promise<IPReputationResult | null>;
  queryDomain(domain: string): Promise<DomainReputationResult | null>;
  queryURL(url: string): Promise<URLReputationResult | null>;
  queryHash(hash: string, hashType?: HashType): Promise<HashReputationResult | null>;
  queryCVE?(cveId: string): Promise<CVEResult | null>;
  
  query(ioc: IOCInput): Promise<ThreatIntelResult | null>;
  
  getHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
  
  getSupportedTypes(): IOCType[];
}

export interface ThreatIntelCache {
  get(key: string): Promise<ThreatIntelResult | null>;
  set(key: string, result: ThreatIntelResult, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): { hits: number; misses: number; size: number };
}

export interface ThreatIntelEvent {
  type: 'query' | 'cache_hit' | 'cache_miss' | 'error' | 'rate_limit';
  provider: ProviderName;
  ioc: IOCInput;
  timestamp: Date;
  duration?: number;
  error?: string;
}

export interface ThreatIntelEventHandler {
  (event: ThreatIntelEvent): void | Promise<void>;
}

export const SEVERITY_SCORES: Record<ThreatSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  info: 10,
  clean: 0,
};

export const CATEGORY_WEIGHTS: Record<ThreatCategory, number> = {
  apt: 100,
  ransomware: 95,
  malware: 80,
  c2: 85,
  botnet: 70,
  phishing: 65,
  exploit: 75,
  ddos: 60,
  fraud: 55,
  cryptojacking: 50,
  scam: 50,
  spam: 30,
  proxy: 25,
  tor: 20,
  scanning: 35,
  unknown: 0,
};

export const PROVIDER_PRIORITIES: Partial<Record<ProviderName, number>> = {
  virustotal: 10,
  otx: 9,
  abuseipdb: 8,
  ibm_xforce: 8,
  weibud: 9,
  qianxin: 8,
  shodan: 6,
  censys: 6,
  greynoise: 7,
};
