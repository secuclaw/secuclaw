import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface AnalysisStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
}

interface VTResponse {
  data?: {
    attributes?: {
      last_analysis_stats?: AnalysisStats;
      last_analysis_results?: Record<string, { result: string; category: string }>;
      reputation?: number;
      total_votes?: { harmless: number; malicious: number };
      tags?: string[];
      country?: string;
      continent?: string;
      asn?: number;
      as_owner?: string;
      network?: string;
      whois?: string;
      whois_date?: number;
      creation_date?: number;
      last_modification_date?: number;
      last_https_certificate_date?: number;
      redirecting_to?: string;
      categories?: Record<string, string>;
      
      type_description?: string;
      type_tag?: string;
      first_submission_date?: number;
      last_submission_date?: number;
      times_submitted?: number;
      
      last_http_response_code?: number;
      last_http_response_content_length?: number;
      title?: string;
      
      md5?: string;
      sha1?: string;
      sha256?: string;
      ssdeep?: string;
      size?: number;

      meaningfull_name?: string;
      names?: string[];
      signature_info?: { description?: string; product?: string };
      trid?: Array<{ file_type: string; probability: number }>;
      sandbox_verdicts?: Record<string, { verdict: string; malware_classification?: string[] }>;
      crowdsourced_yara_results?: Array<{ result: string; description?: string }>;
      attack_techniques?: Array<{ attack_id: string; malware_family?: string; threat_name?: string }>;
    };
    relationships?: {
      resolutions?: { data?: Array<{ attributes?: { ip_address?: string; host_name?: string } }> };
      communicating_files?: { data?: Array<{ id: string }> };
      downloaded_files?: { data?: Array<{ id: string }> };
      urls?: { data?: Array<{ id: string }> };
      referrer_files?: { data?: Array<{ id: string }> };
    };
  };
}

const DEFAULT_STATS: AnalysisStats = { malicious: 0, suspicious: 0, harmless: 0, undetected: 0 };

export class VirusTotalProvider extends BaseProvider {
  name = 'virustotal' as const;
  private baseUrl = 'https://www.virustotal.com/api/v3';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('VirusTotal API key is required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip', 'domain', 'url', 'hash'];
  }

  // CVE is optional - not supported by VirusTotal
  override async queryCVE(_cveId: string): Promise<null> {
    return null;
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-apikey': this.config.apiKey!,
      'Accept': 'application/json',
    };
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<VTResponse>(
        `${this.baseUrl}/ip_addresses/${ip}`,
        this.getHeaders()
      );

      return this.parseIPResponse(ip, response);
    } catch (error) {
      return this.createErrorResult('ip', ip, error) as unknown as IPReputationResult;
    }
  }

  async queryDomain(domain: string): Promise<DomainReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<VTResponse>(
        `${this.baseUrl}/domains/${domain}`,
        this.getHeaders()
      );

      return this.parseDomainResponse(domain, response);
    } catch (error) {
      return this.createErrorResult('domain', domain, error) as unknown as DomainReputationResult;
    }
  }

  async queryURL(url: string): Promise<URLReputationResult | null> {
    try {
      const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
      const response = await this.fetchWithAuth<VTResponse>(
        `${this.baseUrl}/urls/${urlId}`,
        this.getHeaders()
      );

      return this.parseURLResponse(url, response);
    } catch (error) {
      return this.createErrorResult('url', url, error) as unknown as URLReputationResult;
    }
  }

  async queryHash(hash: string): Promise<HashReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<VTResponse>(
        `${this.baseUrl}/files/${hash}`,
        this.getHeaders()
      );

      return this.parseHashResponse(hash, response);
    } catch (error) {
      return this.createErrorResult('hash', hash, error) as unknown as HashReputationResult;
    }
  }

  private parseIPResponse(ip: string, response: VTResponse): IPReputationResult {
    const attrs = response.data?.attributes || {};
    const stats: AnalysisStats = attrs.last_analysis_stats || DEFAULT_STATS;
    const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;
    const detections = stats.malicious + stats.suspicious;

    const result = this.createBaseResult({ type: 'ip', value: ip }, detections > 0, detections > 0);
    
    const severity = this.determineSeverity(
      attrs.reputation || 0,
      detections,
      totalEngines
    );

    return {
      ...result,
      detected: detections > 0,
      malicious: stats.malicious > 0,
      severity,
      confidence: totalEngines > 0 ? detections / totalEngines : 0.5,
      categories: this.mapCategories(attrs.tags || [], []),
      tags: attrs.tags || [],
      reputation: {
        score: attrs.reputation || 0,
        votes: attrs.total_votes || { malicious: 0, benign: 0 },
      },
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date * 1000) : undefined,
      lastSeen: attrs.last_submission_date ? new Date(attrs.last_submission_date * 1000) : undefined,
      geo: attrs.country ? {
        country: attrs.country,
        countryCode: attrs.country,
      } : undefined,
      asn: attrs.asn ? {
        number: attrs.asn,
        name: attrs.as_owner || '',
        country: '',
      } : undefined,
      network: {
        ports: [],
      },
      raw: response.data,
    } as IPReputationResult;
  }

  private parseDomainResponse(domain: string, response: VTResponse): DomainReputationResult {
    const attrs = response.data?.attributes || {};
    const stats: AnalysisStats = attrs.last_analysis_stats || DEFAULT_STATS;
    const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;
    const detections = stats.malicious + stats.suspicious;

    const result = this.createBaseResult({ type: 'domain', value: domain }, detections > 0, detections > 0);
    
    const severity = this.determineSeverity(
      attrs.reputation || 0,
      detections,
      totalEngines
    );

    const resolutions = response.data?.relationships?.resolutions?.data || [];
    const dnsRecords = resolutions.slice(0, 10).map(r => r.attributes?.ip_address || '').filter(Boolean);

    return {
      ...result,
      detected: detections > 0,
      malicious: stats.malicious > 0,
      severity,
      confidence: totalEngines > 0 ? detections / totalEngines : 0.5,
      categories: this.mapCategories(attrs.tags || [], []),
      tags: attrs.tags || [],
      reputation: {
        score: attrs.reputation || 0,
        votes: attrs.total_votes || { malicious: 0, benign: 0 },
      },
      firstSeen: attrs.creation_date ? new Date(attrs.creation_date * 1000) : undefined,
      lastSeen: attrs.last_modification_date ? new Date(attrs.last_modification_date * 1000) : undefined,
      dns: {
        a: dnsRecords,
      },
      webCategories: attrs.categories ? Object.values(attrs.categories) : [],
      whois: attrs.whois ? {
        registrar: this.extractFromWhois(attrs.whois, 'Registrar:'),
        createdAt: this.parseWhoisDate(attrs.whois_date),
      } : undefined,
      raw: response.data,
    } as DomainReputationResult;
  }

  private parseURLResponse(url: string, response: VTResponse): URLReputationResult {
    const attrs = response.data?.attributes || {};
    const stats: AnalysisStats = attrs.last_analysis_stats || DEFAULT_STATS;
    const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;
    const detections = stats.malicious + stats.suspicious;

    const result = this.createBaseResult({ type: 'url', value: url }, detections > 0, detections > 0);
    
    const severity = this.determineSeverity(
      attrs.reputation || 0,
      detections,
      totalEngines
    );

    return {
      ...result,
      detected: detections > 0,
      malicious: stats.malicious > 0,
      severity,
      confidence: totalEngines > 0 ? detections / totalEngines : 0.5,
      categories: this.mapCategories(attrs.tags || [], []),
      tags: attrs.tags || [],
      reputation: {
        score: attrs.reputation || 0,
        votes: attrs.total_votes || { malicious: 0, benign: 0 },
      },
      finalUrl: attrs.redirecting_to,
      statusCode: attrs.last_http_response_code,
      pageTitle: attrs.title,
      webCategories: attrs.categories ? Object.values(attrs.categories) : [],
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date * 1000) : undefined,
      lastSeen: attrs.last_submission_date ? new Date(attrs.last_submission_date * 1000) : undefined,
      raw: response.data,
    } as URLReputationResult;
  }

  private parseHashResponse(hash: string, response: VTResponse): HashReputationResult {
    const attrs = response.data?.attributes || {};
    const stats: AnalysisStats = attrs.last_analysis_stats || DEFAULT_STATS;
    const totalEngines = stats.malicious + stats.suspicious + stats.harmless + stats.undetected;
    const detections = stats.malicious + stats.suspicious;

    const result = this.createBaseResult({ type: 'hash', value: hash }, detections > 0, detections > 0);
    
    const severity = this.determineSeverity(
      attrs.reputation || 0,
      detections,
      totalEngines
    );

    const analysisResults = attrs.last_analysis_results || {};
    const signatures = Object.entries(analysisResults).map(([engine, data]) => ({
      engine,
      result: data.result || 'undetected',
      category: data.category,
    }));

    const yaraMatches = attrs.crowdsourced_yara_results?.map(r => r.result) || [];
    const mitreAttack = attrs.attack_techniques?.map(t => ({
      tactic: t.attack_id.split('.')[0] || '',
      technique: t.attack_id,
    })) || [];

    return {
      ...result,
      detected: detections > 0,
      malicious: stats.malicious > 0,
      severity,
      confidence: totalEngines > 0 ? detections / totalEngines : 0.5,
      categories: this.mapCategories(attrs.tags || [], [attrs.type_description || '']),
      tags: attrs.tags || [],
      malwareFamilies: attrs.attack_techniques?.map(t => t.malware_family).filter(Boolean) || [],
      reputation: {
        score: attrs.reputation || 0,
        votes: attrs.total_votes || { malicious: 0, benign: 0 },
      },
      fileInfo: {
        name: attrs.meaningfull_name || attrs.names?.[0],
        size: attrs.size,
        type: attrs.type_tag || attrs.type_description,
      },
      signatures,
      yaraMatches,
      mitreAttack,
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date * 1000) : undefined,
      lastSeen: attrs.last_submission_date ? new Date(attrs.last_submission_date * 1000) : undefined,
      raw: response.data,
    } as HashReputationResult;
  }

  private extractFromWhois(whois: string, field: string): string | undefined {
    const match = whois.match(new RegExp(`${field}\\s*(.+)`, 'i'));
    return match?.[1]?.trim();
  }

  private parseWhoisDate(timestamp?: number): Date | undefined {
    return timestamp ? new Date(timestamp * 1000) : undefined;
  }

  private createErrorResult(type: 'ip' | 'domain' | 'url' | 'hash', value: string, error: unknown): Record<string, unknown> & { error: string } {
    const base = this.createBaseResult({ type, value } as any);
    return {
      ...base,
      error: error instanceof Error ? error.message : 'Query failed',
    };
  }


  protected override async healthCheck(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/users/current`, this.getHeaders());
  }
}
