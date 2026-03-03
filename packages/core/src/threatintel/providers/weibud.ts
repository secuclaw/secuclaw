import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface WeibudResponse {
  response_code?: number;
  response_message?: string;
  data?: {
    ip?: string;
    domain?: string;
    url?: string;
    md5?: string;
    sha256?: string;
    judgements?: Array<{
      vendor: string;
      result: string;
      confidence: number;
      timestamp: string;
    }>;
    tags?: string[];
    threat_types?: string[];
    malware_family?: string;
    confidence?: number;
    severity?: string;
    first_seen?: string;
    last_seen?: string;
    geo?: {
      country?: string;
      country_code?: string;
      province?: string;
      city?: string;
      isp?: string;
      asn?: number;
      asn_name?: string;
    };
    whois?: {
      registrar?: string;
      created?: string;
      expires?: string;
      registrant?: string;
    };
    dns?: {
      a?: string[];
      mx?: string[];
      ns?: string[];
    };
    related_iocs?: Array<{
      type: string;
      value: string;
      relationship: string;
    }>;
  };
}

export class WeibudProvider extends BaseProvider {
  name = 'weibud' as const;
  private baseUrl = 'https://api.threatbook.cn/v3';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Weibud API key is required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip', 'domain', 'url', 'hash'];
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey!}`,
      'Accept': 'application/json',
    };
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const params = new URLSearchParams({ ip });
      const response = await this.fetchWithAuth<WeibudResponse>(
        `${this.baseUrl}/ip/query?${params.toString()}`,
        this.getHeaders()
      );
      return this.parseIPResponse(ip, response);
    } catch (error) {
      return this.createErrorResult('ip', ip, error);
    }
  }

  async queryDomain(domain: string): Promise<DomainReputationResult | null> {
    try {
      const params = new URLSearchParams({ domain });
      const response = await this.fetchWithAuth<WeibudResponse>(
        `${this.baseUrl}/domain/query?${params.toString()}`,
        this.getHeaders()
      );
      return this.parseDomainResponse(domain, response);
    } catch (error) {
      return this.createErrorResult('domain', domain, error);
    }
  }

  async queryURL(url: string): Promise<URLReputationResult | null> {
    try {
      const params = new URLSearchParams({ url });
      const response = await this.fetchWithAuth<WeibudResponse>(
        `${this.baseUrl}/url/query?${params.toString()}`,
        this.getHeaders()
      );
      return this.parseURLResponse(url, response);
    } catch (error) {
      return this.createErrorResult('url', url, error);
    }
  }

  async queryHash(hash: string): Promise<HashReputationResult | null> {
    try {
      const params = new URLSearchParams({ hash });
      const response = await this.fetchWithAuth<WeibudResponse>(
        `${this.baseUrl}/file/query?${params.toString()}`,
        this.getHeaders()
      );
      return this.parseHashResponse(hash, response);
    } catch (error) {
      return this.createErrorResult('hash', hash, error);
    }
  }

  private parseIPResponse(ip: string, response: WeibudResponse): IPReputationResult {
    const data = response.data;
    if (!data) return this.createEmptyResult('ip', ip);

    const judgements = data.judgements || [];
    const maliciousVotes = judgements.filter(j => j.result === 'malicious').length;
    const isMalicious = maliciousVotes > judgements.length / 2;
    
    const result = this.createBaseResult({ type: 'ip', value: ip }, isMalicious, isMalicious);

    return {
      ...result,
      detected: isMalicious,
      malicious: isMalicious,
      severity: this.mapSeverity(data.severity),
      confidence: data.confidence || (isMalicious ? 0.8 : 0.5),
      categories: this.mapCategories(data.threat_types || [], []),
      tags: data.tags || [],
      malwareFamilies: data.malware_family ? [data.malware_family] : undefined,
      reputation: {
        score: isMalicious ? -75 : 0,
        votes: { malicious: maliciousVotes, benign: judgements.length - maliciousVotes },
      },
      firstSeen: data.first_seen ? new Date(data.first_seen) : undefined,
      lastSeen: data.last_seen ? new Date(data.last_seen) : undefined,
      geo: data.geo ? {
        country: data.geo.country || '',
        countryCode: data.geo.country_code || '',
        region: data.geo.province,
        city: data.geo.city,
      } : undefined,
      asn: data.geo?.asn ? {
        number: data.geo.asn,
        name: data.geo.asn_name || '',
        country: '',
      } : undefined,
      isp: data.geo?.isp,
      organization: data.geo?.isp,
      raw: data,
    } as IPReputationResult;
  }

  private parseDomainResponse(domain: string, response: WeibudResponse): DomainReputationResult {
    const data = response.data;
    if (!data) return this.createEmptyResult('domain', domain) as DomainReputationResult;

    const judgements = data.judgements || [];
    const maliciousVotes = judgements.filter(j => j.result === 'malicious').length;
    const isMalicious = maliciousVotes > judgements.length / 2;

    const result = this.createBaseResult({ type: 'domain', value: domain }, isMalicious, isMalicious);

    return {
      ...result,
      detected: isMalicious,
      malicious: isMalicious,
      severity: this.mapSeverity(data.severity),
      confidence: data.confidence || (isMalicious ? 0.8 : 0.5),
      categories: this.mapCategories(data.threat_types || [], []),
      tags: data.tags || [],
      malwareFamilies: data.malware_family ? [data.malware_family] : undefined,
      reputation: {
        score: isMalicious ? -75 : 0,
        votes: { malicious: maliciousVotes, benign: judgements.length - maliciousVotes },
      },
      firstSeen: data.first_seen ? new Date(data.first_seen) : undefined,
      lastSeen: data.last_seen ? new Date(data.last_seen) : undefined,
      dns: data.dns,
      whois: data.whois ? {
        registrar: data.whois.registrar,
        createdAt: data.whois.created ? new Date(data.whois.created) : undefined,
        expiresAt: data.whois.expires ? new Date(data.whois.expires) : undefined,
        registrant: data.whois.registrant,
      } : undefined,
      raw: data,
    } as DomainReputationResult;
  }

  private parseURLResponse(url: string, response: WeibudResponse): URLReputationResult {
    const data = response.data;
    if (!data) return this.createEmptyResult('url', url) as URLReputationResult;

    const judgements = data.judgements || [];
    const maliciousVotes = judgements.filter(j => j.result === 'malicious').length;
    const isMalicious = maliciousVotes > judgements.length / 2;

    const result = this.createBaseResult({ type: 'url', value: url }, isMalicious, isMalicious);

    return {
      ...result,
      detected: isMalicious,
      malicious: isMalicious,
      severity: this.mapSeverity(data.severity),
      confidence: data.confidence || (isMalicious ? 0.8 : 0.5),
      categories: this.mapCategories(data.threat_types || [], []),
      tags: data.tags || [],
      reputation: {
        score: isMalicious ? -75 : 0,
        votes: { malicious: maliciousVotes, benign: judgements.length - maliciousVotes },
      },
      raw: data,
    } as URLReputationResult;
  }

  private parseHashResponse(hash: string, response: WeibudResponse): HashReputationResult {
    const data = response.data;
    if (!data) return this.createEmptyResult('hash', hash) as HashReputationResult;

    const judgements = data.judgements || [];
    const maliciousVotes = judgements.filter(j => j.result === 'malicious').length;
    const isMalicious = maliciousVotes > judgements.length / 2;

    const signatures = judgements.map(j => ({
      engine: j.vendor,
      result: j.result,
      category: j.result === 'malicious' ? 'malicious' : 'harmless',
    }));

    const result = this.createBaseResult({ type: 'hash', value: hash }, isMalicious, isMalicious);

    return {
      ...result,
      detected: isMalicious,
      malicious: isMalicious,
      severity: this.mapSeverity(data.severity),
      confidence: data.confidence || (isMalicious ? 0.8 : 0.5),
      categories: this.mapCategories(data.threat_types || [], []),
      tags: data.tags || [],
      malwareFamilies: data.malware_family ? [data.malware_family] : undefined,
      signatures,
      reputation: {
        score: isMalicious ? -75 : 0,
        votes: { malicious: maliciousVotes, benign: judgements.length - maliciousVotes },
      },
      raw: data,
    } as HashReputationResult;
  }

  private mapSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean'> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'info',
      'safe': 'clean',
      'clean': 'clean',
    };
    return severity ? map[severity.toLowerCase()] || 'info' : 'clean';
  }

  private createEmptyResult(type: IOCType, value: string): any {
    return {
      ...this.createBaseResult({ type, value } as any),
      detected: false,
      malicious: false,
      severity: 'clean' as const,
      confidence: 0.5,
    };
  }

  private createErrorResult(type: IOCType, value: string, error: unknown): any {
    return {
      ...this.createBaseResult({ type, value } as any),
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }

  protected override async healthCheck(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/user/info`, this.getHeaders());
  }
}
