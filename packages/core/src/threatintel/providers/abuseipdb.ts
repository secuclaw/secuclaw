import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface AbuseIPDBResponse {
  data?: {
    ipAddress?: string;
    isPublic?: boolean;
    ipVersion?: number;
    isWhitelisted?: boolean;
    abuseConfidenceScore?: number;
    countrycode?: string;
    countryCode?: string;
    countryName?: string;
    usageType?: string;
    isp?: string;
    domain?: string;
    hostnames?: string[];
    totalReports?: number;
    numDistinctUsers?: number;
    lastReportedAt?: string;
    reports?: Array<{
      reportedAt: string;
      comment: string;
      categories: number[];
      reporterId: number;
      reporterCountryCode: string;
      reporterCountryName: string;
    }>;
  };
  errors?: Array<{ detail: string }>;
}

const ABUSE_CATEGORY_MAP: Record<number, string> = {
  1: 'dns_compromise',
  2: 'dns_poisoning',
  3: 'fraud_orders',
  4: 'ddos_attack',
  5: 'ftp_brute_force',
  6: 'ping_of_death',
  7: 'phishing',
  8: 'fraud_voip',
  9: 'open_proxy',
  10: 'web_spam',
  11: 'email_spam',
  12: 'blog_spam',
  13: 'vpn_ip',
  14: 'port_scan',
  15: 'hacking',
  16: 'sql_injection',
  17: 'spoofing',
  18: 'brute_force',
  19: 'bad_web_bot',
  20: 'exploit',
  21: 'web_app_attack',
  22: 'ssh',
  23: 'iot_targeted',
};

export class AbuseIPDBProvider extends BaseProvider {
  name = 'abuseipdb' as const;
  private baseUrl = 'https://api.abuseipdb.com/api/v2';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('AbuseIPDB API key is required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip'];
  }

  private getHeaders(): Record<string, string> {
    return {
      'Key': this.config.apiKey!,
      'Accept': 'application/json',
    };
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const params = new URLSearchParams({
        ipAddress: ip,
        maxAgeInDays: '90',
        verbose: 'true',
      });

      const response = await this.fetchWithAuth<AbuseIPDBResponse>(
        `${this.baseUrl}/check?${params.toString()}`,
        this.getHeaders()
      );

      return this.parseResponse(ip, response);
    } catch (error) {
      return this.createErrorResult(ip, error);
    }
  }

  async queryDomain(_domain: string): Promise<DomainReputationResult | null> {
    return null;
  }

  async queryURL(_url: string): Promise<URLReputationResult | null> {
    return null;
  }

  async queryHash(_hash: string): Promise<HashReputationResult | null> {
    return null;
  }

  private parseResponse(ip: string, response: AbuseIPDBResponse): IPReputationResult {
    const data = response.data;
    
    if (!data) {
      return this.createEmptyResult(ip);
    }

    const abuseScore = data.abuseConfidenceScore || 0;
    const totalReports = data.totalReports || 0;
    const isMalicious = abuseScore >= 50;
    const isSuspicious = abuseScore >= 25;

    const categories = new Set<string>();
    const reports = data.reports || [];
    for (const report of reports) {
      for (const catId of report.categories) {
        const categoryName = ABUSE_CATEGORY_MAP[catId] || 'unknown';
        categories.add(categoryName);
      }
    }

    const tags = [
      ...(data.isWhitelisted ? ['whitelisted'] : []),
      ...(data.isPublic ? ['public'] : ['private']),
      ...(data.usageType ? [data.usageType] : []),
      ...(data.hostnames || []),
    ];

    const result = this.createBaseResult(
      { type: 'ip', value: ip },
      isSuspicious,
      isMalicious
    );

    return {
      ...result,
      abuseConfidenceScore: abuseScore,
      detected: isSuspicious,
      malicious: isMalicious,
      severity: this.scoreToSeverity(abuseScore),
      confidence: abuseScore / 100,
      categories: this.mapCategories(Array.from(categories), []),
      tags,
      reputation: {
        score: -abuseScore,
        votes: { malicious: totalReports, benign: data.isWhitelisted ? 1 : 0 },
      },
      lastSeen: data.lastReportedAt ? new Date(data.lastReportedAt) : undefined,
      geo: data.countryCode ? {
        country: data.countryName || '',
        countryCode: data.countryCode,
      } : undefined,
      isp: data.isp,
      organization: data.isp,
      asn: undefined,
      isProxy: categories.has('open_proxy') || categories.has('vpn_ip'),
      isTor: false,
      isVpn: categories.has('vpn_ip'),
      isDataCenter: data.usageType === 'Data Center/Web Hosting/Transit',
      isResidential: data.usageType === 'Residential',
      isMobile: data.usageType === 'Mobile Network',
      raw: data,
    } as IPReputationResult;
  }

  private scoreToSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' | 'info' | 'clean' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    if (score > 0) return 'info';
    return 'clean';
  }

  private createEmptyResult(ip: string): IPReputationResult {
    const result = this.createBaseResult({ type: 'ip', value: ip });
    return {
      ...result,
      detected: false,
      malicious: false,
      severity: 'clean',
      confidence: 0.5,
    } as IPReputationResult;
  }

  private createErrorResult(ip: string, error: unknown): IPReputationResult {
    const result = this.createBaseResult({ type: 'ip', value: ip });
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Query failed',
    } as IPReputationResult;
  }

  protected override async healthCheck(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/status`, this.getHeaders());
  }
}
