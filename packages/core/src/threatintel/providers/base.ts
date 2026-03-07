import type {
  ThreatIntelProvider,
  ThreatIntelConfig,
  IOCInput,
  IOCResult,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  CVEResult,
  ThreatIntelResult,
  IOCType,
  ThreatSeverity,
  ThreatCategory,
  ProviderName,
} from '../types.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_CACHE_TTL = 3600000;

export abstract class BaseProvider implements ThreatIntelProvider {
  abstract name: ProviderName;
  config: ThreatIntelConfig;
  
  private requestCount = 0;
  private lastRequestTime = 0;
  private requestTimestamps: number[] = [];

  constructor(config: ThreatIntelConfig) {
    this.config = {
      timeout: DEFAULT_TIMEOUT,
      cacheTTL: DEFAULT_CACHE_TTL,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    await this.validateConfig();
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }
  }

  abstract queryIP(ip: string): Promise<IPReputationResult | null>;
  abstract queryDomain(domain: string): Promise<DomainReputationResult | null>;
  abstract queryURL(url: string): Promise<URLReputationResult | null>;
  abstract queryHash(hash: string, hashType?: string): Promise<HashReputationResult | null>;
  abstract queryCVE?(cveId: string): Promise<CVEResult | null>;
  abstract getSupportedTypes(): IOCType[];

  async query(ioc: IOCInput): Promise<ThreatIntelResult | null> {
    await this.checkRateLimit();

    switch (ioc.type) {
      case 'ip':
        return this.queryIP(ioc.value);
      case 'domain':
        return this.queryDomain(ioc.value);
      case 'url':
        return this.queryURL(ioc.value);
      case 'hash':
        return this.queryHash(ioc.value, ioc.hashType);
      case 'cve':
        if (this.queryCVE) {
          return this.queryCVE(ioc.value);
        }
        return null;
      default:
        return null;
    }
  }

  protected async fetch<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || DEFAULT_TIMEOUT
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'SecuClaw-ThreatIntel/1.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected async fetchWithAuth<T>(
    url: string,
    authHeaders: Record<string, string>,
    options: RequestInit = {}
  ): Promise<T> {
    return this.fetch<T>(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    });
  }

  protected async checkRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = this.config.rateLimit.requestsPerMinute;

    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < windowMs
    );

    if (this.requestTimestamps.length >= maxRequests) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requestTimestamps.push(now);
  }

  protected createBaseResult(
    ioc: IOCInput,
    detected: boolean = false,
    malicious: boolean = false
  ): IOCResult {
    return {
      ioc,
      provider: this.name,
      retrievedAt: new Date(),
      cached: false,
      detected,
      malicious,
      severity: malicious ? 'high' : 'info',
      confidence: detected ? 0.8 : 0.5,
      categories: [],
      tags: [],
      reputation: {
        score: malicious ? -50 : (detected ? -20 : 0),
        votes: { malicious: malicious ? 1 : 0, benign: malicious ? 0 : 1 },
      },
    };
  }

  protected determineSeverity(score: number, detections: number, total: number): ThreatSeverity {
    if (score >= 80 || (total > 0 && detections / total >= 0.7)) {
      return 'critical';
    }
    if (score >= 60 || (total > 0 && detections / total >= 0.5)) {
      return 'high';
    }
    if (score >= 40 || (total > 0 && detections / total >= 0.3)) {
      return 'medium';
    }
    if (score >= 20 || (total > 0 && detections / total >= 0.1)) {
      return 'low';
    }
    if (score > 0 || detections > 0) {
      return 'info';
    }
    return 'clean';
  }

  protected mapCategories(tags: string[], descriptions: string[]): ThreatCategory[] {
    const categoryKeywords: Record<ThreatCategory, string[]> = {
      malware: ['malware', 'malicious', 'virus', 'trojan', 'worm'],
      ransomware: ['ransomware', 'encrypt', 'crypto'],
      phishing: ['phishing', 'phish', 'fraudulent'],
      spam: ['spam', 'spammer'],
      botnet: ['botnet', 'bot', 'zombie'],
      c2: ['c2', 'command', 'control', 'c&c'],
      apt: ['apt', 'advanced', 'persistent', 'targeted'],
      cryptojacking: ['cryptojacking', 'coinminer', 'cryptominer'],
      ddos: ['ddos', 'dos', 'flood'],
      fraud: ['fraud', 'scam', 'fake'],
      scam: ['scam', 'fraud'],
      proxy: ['proxy', 'open proxy'],
      tor: ['tor', 'onion', 'exit node'],
      scanning: ['scanner', 'scanning', 'recon'],
      exploit: ['exploit', 'vulnerability', 'cve'],
      unknown: [],
    };

    const categories = new Set<ThreatCategory>();
    const allText = [...tags, ...descriptions].map(t => t.toLowerCase()).join(' ');

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => allText.includes(kw))) {
        categories.add(category as ThreatCategory);
      }
    }

    return Array.from(categories);
  }

  async getHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.healthCheck();
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return { 
        healthy: false, 
        latency: Date.now() - start, 
        error: error instanceof Error ? error.message : 'Health check failed' 
      };
    }
  }

  protected async healthCheck(): Promise<void> {
    return;
  }
}

export function classifyIOC(value: string): IOCInput {
  const trimmed = value.trim().toLowerCase();
  
  if (/^cve-\d{4}-\d{4,}$/i.test(value)) {
    return { type: 'cve', value: value.toUpperCase() };
  }
  
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
    return { type: 'ip', value: trimmed };
  }
  
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return { type: 'hash', value: trimmed, hashType: 'md5' };
  }
  if (/^[a-f0-9]{40}$/i.test(trimmed)) {
    return { type: 'hash', value: trimmed, hashType: 'sha1' };
  }
  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return { type: 'hash', value: trimmed, hashType: 'sha256' };
  }
  if (/^[a-f0-9]{128}$/i.test(trimmed)) {
    return { type: 'hash', value: trimmed, hashType: 'sha512' };
  }
  
  if (/^https?:\/\//i.test(value)) {
    return { type: 'url', value: value };
  }
  
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return { type: 'email', value: trimmed };
  }
  
  if (/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(trimmed)) {
    return { type: 'domain', value: trimmed };
  }
  
  return { type: 'hash', value: trimmed, hashType: 'sha256' };
}
