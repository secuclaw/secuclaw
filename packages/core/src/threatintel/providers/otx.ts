import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface OTXPulse {
  id: string;
  name: string;
  description?: string;
  author_name: string;
  tags: string[];
  references: string[];
  created: string;
  modified: string;
  adversary?: string;
  malware_families?: string[];
  industries?: string[];
  targeted_countries?: string[];
}

interface OTXResponse {
  type?: string;
  base_indicator?: {
    id: number;
    indicator: string;
    type: string;
    title?: string;
    description?: string;
    content?: string;
  };
  general?: {
    whois?: string;
    pulse_info?: {
      count: number;
      pulses: Array<{
        id: string;
        name: string;
        tags: string[];
        references: string[];
        created: string;
        modified: string;
        author: { username: string };
        adversary?: string;
        malware_families?: string[];
      }>;
    };
  };
  reputation?: {
    reputation?: number;
    threat_score?: number;
    activities?: Array<{
      name: string;
      title: string;
      count: number;
    }>;
  };
  geo?: {
    country_code?: string;
    country_name?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    asn?: string;
    asn_name?: string;
  };
  url_list?: Array<{
    url: string;
    date: string;
    domain: string;
    result: boolean;
  }>;
  passive_dns?: Array<{
    address: string;
    hostname: string;
    record_type: string;
    first: string;
    last: string;
  }>;
  hash_info?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
    ssdeep?: string;
    type?: string;
    filetype?: string;
    filesize?: number;
    preview?: string;
    exif?: Record<string, string>;
  };
  analysis?: {
    info?: Record<string, { result: string; detected: boolean }>;
    samples?: Array<{
      hash: string;
      date: string;
    }>;
  };
  sections: string[];
}

export class OTXProvider extends BaseProvider {
  name = 'otx' as const;
  private baseUrl = 'https://otx.alienvault.com/api/v1';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OTX API key is required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip', 'domain', 'url', 'hash'];
  }

  override async queryCVE(_cveId: string): Promise<null> {
    return null;
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-OTX-API-KEY': this.config.apiKey!,
      'Accept': 'application/json',
    };
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<OTXResponse>(
        `${this.baseUrl}/indicators/IPv4/${ip}/general`,
        this.getHeaders()
      );

      return this.parseIPResponse(ip, response);
    } catch (error) {
      return this.createErrorResult('ip', ip, error) as unknown as IPReputationResult;
    }
  }

  async queryDomain(domain: string): Promise<DomainReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<OTXResponse>(
        `${this.baseUrl}/indicators/domain/${domain}/general`,
        this.getHeaders()
      );

      const dnsResponse = await this.fetchWithAuth<{ passive_dns?: OTXResponse['passive_dns'] }>(
        `${this.baseUrl}/indicators/domain/${domain}/passive_dns`,
        this.getHeaders()
      );

      return this.parseDomainResponse(domain, response, dnsResponse);
    } catch (error) {
      return this.createErrorResult('domain', domain, error) as unknown as DomainReputationResult;
    }
  }

  async queryURL(url: string): Promise<URLReputationResult | null> {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await this.fetchWithAuth<OTXResponse>(
        `${this.baseUrl}/indicators/url/${encodedUrl}/general`,
        this.getHeaders()
      );

      return this.parseURLResponse(url, response);
    } catch (error) {
      return this.createErrorResult('url', url, error) as unknown as URLReputationResult;
    }
  }

  async queryHash(hash: string): Promise<HashReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<OTXResponse>(
        `${this.baseUrl}/indicators/file/${hash}/general`,
        this.getHeaders()
      );

      return this.parseHashResponse(hash, response);
    } catch (error) {
      return this.createErrorResult('hash', hash, error) as unknown as HashReputationResult;
    }
  }

  private parseIPResponse(ip: string, response: OTXResponse): IPReputationResult {
    const pulses = response.general?.pulse_info?.pulses || [];
    const pulseCount = pulses.length;
    const hasMaliciousPulse = pulseCount > 0;

    const result = this.createBaseResult({ type: 'ip', value: ip }, hasMaliciousPulse, hasMaliciousPulse);

    const tags = [...new Set(pulses.flatMap(p => p.tags))];
    const malwareFamilies = [...new Set(pulses.flatMap(p => p.malware_families || []))];
    const threatActors = [...new Set(pulses.map(p => p.adversary).filter(Boolean))] as string[];

    const geo = response.geo;
    const reputation = response.reputation;

    return {
      ...result,
      detected: hasMaliciousPulse,
      malicious: hasMaliciousPulse,
      severity: this.determineSeverityFromPulses(pulses),
      confidence: Math.min(0.9, pulseCount * 0.15 + 0.3),
      categories: this.mapCategories(tags, []),
      tags,
      malwareFamilies,
      threatActors,
      campaigns: pulses.map(p => p.name).slice(0, 5),
      reputation: {
        score: reputation?.threat_score || (hasMaliciousPulse ? -50 : 0),
        votes: { malicious: pulseCount, benign: 0 },
      },
      geo: geo ? {
        country: geo.country_name || '',
        countryCode: geo.country_code || '',
        city: geo.city,
        region: geo.region,
        latitude: geo.latitude,
        longitude: geo.longitude,
      } : undefined,
      asn: geo?.asn ? {
        number: parseInt(geo.asn, 10) || 0,
        name: geo.asn_name || '',
        country: '',
      } : undefined,
      raw: response,
    } as unknown as IPReputationResult;
  }

  private parseDomainResponse(
    domain: string, 
    response: OTXResponse,
    dnsResponse?: { passive_dns?: OTXResponse['passive_dns'] }
  ): DomainReputationResult {
    const pulses = response.general?.pulse_info?.pulses || [];
    const pulseCount = pulses.length;
    const hasMaliciousPulse = pulseCount > 0;

    const result = this.createBaseResult({ type: 'domain', value: domain }, hasMaliciousPulse, hasMaliciousPulse);

    const tags = [...new Set(pulses.flatMap(p => p.tags))];
    const malwareFamilies = [...new Set(pulses.flatMap(p => p.malware_families || []))];

    const passiveDns = dnsResponse?.passive_dns || [];
    const aRecords = passiveDns
      .filter(d => d.record_type === 'A')
      .map(d => d.address);

    return {
      ...result,
      detected: hasMaliciousPulse,
      malicious: hasMaliciousPulse,
      severity: this.determineSeverityFromPulses(pulses),
      confidence: Math.min(0.9, pulseCount * 0.15 + 0.3),
      categories: this.mapCategories(tags, []),
      tags,
      malwareFamilies,
      campaigns: pulses.map(p => p.name).slice(0, 5),
      reputation: {
        score: hasMaliciousPulse ? -50 : 0,
        votes: { malicious: pulseCount, benign: 0 },
      },
      dns: {
        a: aRecords,
      },
      whois: response.general?.whois ? {
        registrar: this.extractFromWhois(response.general.whois, 'Registrar:'),
      } : undefined,
      raw: { general: response, passive_dns: passiveDns },
    } as DomainReputationResult;
  }

  private parseURLResponse(url: string, response: OTXResponse): URLReputationResult {
    const pulses = response.general?.pulse_info?.pulses || [];
    const pulseCount = pulses.length;
    const hasMaliciousPulse = pulseCount > 0;

    const result = this.createBaseResult({ type: 'url', value: url }, hasMaliciousPulse, hasMaliciousPulse);

    const tags = [...new Set(pulses.flatMap(p => p.tags))];

    return {
      ...result,
      detected: hasMaliciousPulse,
      malicious: hasMaliciousPulse,
      severity: this.determineSeverityFromPulses(pulses),
      confidence: Math.min(0.9, pulseCount * 0.15 + 0.3),
      categories: this.mapCategories(tags, []),
      tags,
      campaigns: pulses.map(p => p.name).slice(0, 5),
      reputation: {
        score: hasMaliciousPulse ? -50 : 0,
        votes: { malicious: pulseCount, benign: 0 },
      },
      raw: response,
    } as unknown as URLReputationResult;
  }

  private parseHashResponse(hash: string, response: OTXResponse): HashReputationResult {
    const pulses = response.general?.pulse_info?.pulses || [];
    const pulseCount = pulses.length;
    const hasMaliciousPulse = pulseCount > 0;

    const result = this.createBaseResult({ type: 'hash', value: hash }, hasMaliciousPulse, hasMaliciousPulse);

    const tags = [...new Set(pulses.flatMap(p => p.tags))];
    const malwareFamilies = [...new Set(pulses.flatMap(p => p.malware_families || []))];

    const hashInfo = response.hash_info;
    const analysis = response.analysis?.info || {};
    
    const signatures = Object.entries(analysis).map(([engine, data]) => ({
      engine,
      result: data.result,
      category: data.detected ? 'malicious' : 'harmless',
    }));

    return {
      ...result,
      detected: hasMaliciousPulse || signatures.some(s => s.category === 'malicious'),
      malicious: hasMaliciousPulse,
      severity: this.determineSeverityFromPulses(pulses),
      confidence: Math.min(0.9, pulseCount * 0.15 + 0.3),
      categories: this.mapCategories(tags, []),
      tags,
      malwareFamilies,
      campaigns: pulses.map(p => p.name).slice(0, 5),
      reputation: {
        score: hasMaliciousPulse ? -50 : 0,
        votes: { malicious: pulseCount, benign: 0 },
      },
      fileInfo: hashInfo ? {
        name: hashInfo.md5,
        size: hashInfo.filesize,
        type: hashInfo.filetype || hashInfo.type,
      } : undefined,
      signatures,
      raw: response,
    } as unknown as HashReputationResult;
  }

  private determineSeverityFromPulses(pulses: Array<{ id: string; name: string; tags: string[] }> | undefined): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean' {
    if (!pulses || pulses.length >= 10) return pulses ? 'critical' : 'clean';
    if (pulses.length >= 10) return 'critical';
    if (pulses.length >= 5) return 'high';
    if (pulses.length >= 2) return 'medium';
    if (pulses.length === 1) return 'low';
    if (pulses.length >= 2) return 'medium';
    if (pulses.length === 1) return 'low';
    return 'clean';
  }

  private extractFromWhois(whois: string, field: string): string | undefined {
    const match = whois.match(new RegExp(`${field}\\s*(.+)`, 'i'));
    return match?.[1]?.trim();
  }

  private createErrorResult(type: 'ip' | 'domain' | 'url' | 'hash', value: string, error: unknown): any {
    const base = this.createBaseResult({ type, value } as any);
    return {
      ...base,
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }

  protected override async healthCheck(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/user/me`, this.getHeaders());
  }
}
