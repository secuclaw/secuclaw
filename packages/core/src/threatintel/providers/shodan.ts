import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface ShodanHost {
  ip: number;
  ip_str: string;
  hostnames: string[];
  country_code: string;
  country_name: string;
  city: string;
  region_code: string;
  latitude: number;
  longitude: number;
  asn: string;
  isp: string;
  org: string;
  ports: number[];
  vulns: string[];
  tags: string[];
  os: string;
  transport: string;
  data: Array<{
    port: number;
    proto: string;
    service: string;
    product?: string;
    version?: string;
    banner?: string;
    vulns?: Record<string, { verified: boolean; cvss: number; references: string[] }>;
    ssl?: {
      cert?: {
        issuer?: Record<string, string>;
        subject?: Record<string, string>;
        expires?: string;
        issued?: string;
      };
    };
  }>;
  _shodan?: {
    id: string;
    module: string;
    crawler: string;
  };
}

interface ShodanResponse {
  ip?: number;
  ip_str?: string;
  country_code?: string;
  country_name?: string;
  city?: string;
  region_code?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  isp?: string;
  org?: string;
  ports?: number[];
  vulns?: string[];
  tags?: string[];
  hostnames?: string[];
  domains?: string[];
  os?: string;
  data?: ShodanHost['data'];
  error?: string;
}

interface ShodanSearchResponse {
  total: number;
  matches: ShodanHost[];
  facets: Record<string, Array<{ value: string; count: number }>>;
}

export class ShodanProvider extends BaseProvider {
  name = 'shodan' as const;
  private baseUrl = 'https://api.shodan.io';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Shodan API key is required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip', 'domain'];
  }

  private buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    const searchParams = new URLSearchParams({ key: this.config.apiKey!, ...params });
    return `${this.baseUrl}${endpoint}?${searchParams.toString()}`;
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const response = await this.fetch<ShodanResponse>(
        this.buildUrl(`/shodan/host/${ip}`)
      );

      return this.parseIPResponse(ip, response);
    } catch (error) {
      return this.createErrorResult('ip', ip, error);
    }
  }

  async queryDomain(domain: string): Promise<DomainReputationResult | null> {
    try {
      const response = await this.fetch<ShodanSearchResponse>(
        this.buildUrl('/shodan/host/search', { query: `hostname:${domain}` })
      );

      return this.parseDomainResponse(domain, response);
    } catch (error) {
      return this.createErrorResult('domain', domain, error);
    }
  }

  async queryURL(_url: string): Promise<URLReputationResult | null> {
    return null;
  }

  async queryHash(_hash: string): Promise<HashReputationResult | null> {
    return null;
  }

  private parseIPResponse(ip: string, response: ShodanResponse): IPReputationResult {
    const hasVulns = (response.vulns?.length || 0) > 0;
    const hasSuspiciousPorts = this.hasSuspiciousPorts(response.ports || []);
    const detected = hasVulns || hasSuspiciousPorts;

    const result = this.createBaseResult({ type: 'ip', value: ip }, detected, hasVulns);

    const tags = [
      ...(response.tags || []),
      ...(response.hostnames || []),
    ];

    const categories = this.inferCategories(response.ports || [], response.vulns || []);

    return {
      ...result,
      detected,
      malicious: hasVulns,
      severity: this.determineSeverity(response.vulns || []),
      confidence: hasVulns ? 0.85 : (detected ? 0.6 : 0.3),
      categories,
      tags,
      reputation: {
        score: hasVulns ? -70 : (detected ? -30 : 0),
        votes: { malicious: hasVulns ? 1 : 0, benign: hasVulns ? 0 : 1 },
      },
      geo: response.country_code ? {
        country: response.country_name || '',
        countryCode: response.country_code,
        city: response.city,
        region: response.region_code,
        latitude: response.latitude,
        longitude: response.longitude,
      } : undefined,
      asn: response.asn ? {
        number: parseInt(response.asn.replace('AS', ''), 10) || 0,
        name: response.isp || '',
        country: '',
      } : undefined,
      isp: response.isp,
      organization: response.org,
      openPorts: response.ports,
      vulnerabilities: response.vulns,
      network: {
        ports: response.ports,
        services: this.extractServices(response.data || []),
      },
      raw: response,
    } as IPReputationResult;
  }

  private parseDomainResponse(domain: string, response: ShodanSearchResponse): DomainReputationResult {
    const matches = response.matches || [];
    const hasVulns = matches.some(m => (m.vulns?.length || 0) > 0);
    const detected = matches.length > 0;

    const result = this.createBaseResult({ type: 'domain', value: domain }, detected, hasVulns);

    const allPorts = [...new Set(matches.flatMap(m => m.ports || []))];
    const allVulns = [...new Set(matches.flatMap(m => m.vulns || []))];
    const allTags = [...new Set(matches.flatMap(m => m.tags || []))];
    const resolvedIPs = [...new Set(matches.map(m => m.ip_str).filter(Boolean))];

    return {
      ...result,
      detected,
      malicious: hasVulns,
      severity: this.determineSeverity(allVulns),
      confidence: hasVulns ? 0.85 : (detected ? 0.6 : 0.3),
      categories: this.inferCategories(allPorts, allVulns),
      tags: allTags,
      reputation: {
        score: hasVulns ? -70 : (detected ? -30 : 0),
        votes: { malicious: hasVulns ? 1 : 0, benign: hasVulns ? 0 : 1 },
      },
      dns: {
        a: resolvedIPs,
      },
      network: {
        ports: allPorts,
        services: this.extractServices(matches.flatMap(m => m.data || [])),
      },
      raw: { matches, total: response.total },
    } as DomainReputationResult;
  }

  private hasSuspiciousPorts(ports: number[]): boolean {
    const suspiciousPorts = [
      22, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 5901,
      6379, 27017, 9200, 9300, 11211, 27018, 27019
    ];
    return ports.some(p => suspiciousPorts.includes(p));
  }

  private inferCategories(ports: number[], vulns: string[]): import('../types.js').ThreatCategory[] {
    const categories: Set<import('../types.js').ThreatCategory> = new Set();

    if (vulns.length > 0) {
      categories.add('exploit');
    }

    const portToCategory: Record<number, import('../types.js').ThreatCategory[]> = {
      22: ['scanning'],
      23: ['scanning'],
      445: ['scanning', 'malware'],
      3389: ['scanning'],
      4444: ['c2', 'malware'],
      6666: ['c2', 'malware'],
      6667: ['botnet'],
    };

    for (const port of ports) {
      const cats = portToCategory[port];
      if (cats) {
        cats.forEach(c => categories.add(c));
      }
    }

    return Array.from(categories);
  }

  private determineSeverity(vulns: string[]): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean' {
    if (vulns.length >= 5) return 'critical';
    if (vulns.length >= 3) return 'high';
    if (vulns.length >= 1) return 'medium';
    return 'clean';
  }

  private extractServices(data: ShodanHost['data']): string[] {
    const services = new Set<string>();
    for (const item of data) {
      if (item.product) {
        services.add(`${item.port}/${item.proto} ${item.product}${item.version ? ' ' + item.version : ''}`);
      } else if (item.service) {
        services.add(`${item.port}/${item.proto} ${item.service}`);
      }
    }
    return Array.from(services);
  }

  private createErrorResult(type: IOCType, value: string, error: unknown): any {
    return {
      ...this.createBaseResult({ type, value } as any),
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }

  async searchHosts(query: string, limit: number = 100): Promise<ShodanSearchResponse> {
    return this.fetch<ShodanSearchResponse>(
      this.buildUrl('/shodan/host/search', { query, limit: String(limit) })
    );
  }

  async getPorts(): Promise<{ ports: number[] }> {
    return this.fetch<{ ports: number[] }>(this.buildUrl('/shodan/ports'));
  }

  protected override async healthCheck(): Promise<void> {
    await this.fetch(this.buildUrl('/api-info'));
  }
}
