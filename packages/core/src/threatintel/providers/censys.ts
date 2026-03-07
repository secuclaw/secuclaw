import { BaseProvider } from './base.js';
import type {
  ThreatIntelConfig,
  IPReputationResult,
  DomainReputationResult,
  URLReputationResult,
  HashReputationResult,
  IOCType,
} from '../types.js';

interface CensysHost {
  ip: string;
  services: Array<{
    port: number;
    service_name: string;
    transport_protocol: string;
    software?: Array<{
      uniform_resource_identifier?: string;
      product?: string;
      version?: string;
    }>;
    certificate?: string;
    tls?: {
      server_certificates?: {
        certificate?: {
          parsed?: {
            subject?: string;
            issuer?: string;
            validity?: {
              not_after?: string;
              not_before?: string;
            };
            fingerprint?: {
              sha256?: string;
            };
          };
        };
      };
    };
    banner?: string;
  }>;
  location?: {
    country?: string;
    country_code?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    province?: string;
  };
  autonomous_system?: {
    asn?: number;
    bgp_prefix?: string;
    description?: string;
    name?: string;
  };
  operating_system?: {
    uniform_resource_identifier?: string;
    product?: string;
    vendor?: string;
    version?: string;
  };
  dns?: {
    reverse_dns?: {
      names?: string[];
    };
  };
  metadata?: {
    first_seen?: string;
    last_seen?: string;
  };
}

interface CensysSearchResult {
  code: number;
  status: string;
  result: {
    total: number;
    hits: CensysHost[];
    links?: {
      prev?: string;
      next?: string;
    };
  };
}

interface CensysHostResult {
  code: number;
  status: string;
  result: CensysHost;
}

interface CensysCertificateResult {
  code: number;
  status: string;
  result: {
    parsed?: {
      subject?: string;
      issuer?: string;
      validity?: {
        not_after?: string;
        not_before?: string;
      };
      fingerprint?: {
        sha256?: string;
        sha1?: string;
        md5?: string;
      };
      names?: string[];
      subject_dn?: string;
      issuer_dn?: string;
    };
    raw?: string;
    tags?: string[];
    metadata?: {
      first_seen?: string;
      last_seen?: string;
    };
    validation?: {
      nss?: {
        valid?: boolean;
        type?: string;
      };
    };
  };
}

export class CensysProvider extends BaseProvider {
  name = 'censys' as const;
  private baseUrl = 'https://search.censys.io/api/v2';

  constructor(config: ThreatIntelConfig) {
    super(config);
    this.baseUrl = config.baseUrl || this.baseUrl;
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Censys API ID and API Secret are required');
    }
  }

  getSupportedTypes(): IOCType[] {
    return ['ip', 'domain', 'certificate'];
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
    };
  }

  async queryIP(ip: string): Promise<IPReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<CensysHostResult>(
        `${this.baseUrl}/hosts/${ip}`,
        this.getAuthHeaders()
      );

      return this.parseIPResponse(ip, response);
    } catch (error) {
      return this.createErrorResult('ip', ip, error);
    }
  }

  async queryDomain(domain: string): Promise<DomainReputationResult | null> {
    try {
      const response = await this.fetchWithAuth<CensysSearchResult>(
        `${this.baseUrl}/hosts/search?q=${encodeURIComponent(`services.tls.certificate.parsed.names:${domain}`)}`,
        this.getAuthHeaders()
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

  async queryCertificate(fingerprint: string): Promise<CensysCertificateResult | null> {
    try {
      const response = await this.fetchWithAuth<CensysCertificateResult>(
        `${this.baseUrl}/certificates/${fingerprint}`,
        this.getAuthHeaders()
      );
      return response;
    } catch {
      return null;
    }
  }

  private parseIPResponse(ip: string, response: CensysHostResult): IPReputationResult {
    const host = response.result;
    if (!host) {
      return this.createEmptyResult('ip', ip) as IPReputationResult;
    }

    const ports = host.services?.map(s => s.port) || [];
    const hasCertificates = host.services?.some(s => s.certificate || s.tls) || false;
    const detected = ports.length > 0;

    const result = this.createBaseResult({ type: 'ip', value: ip }, detected, false);

    const tags = host.dns?.reverse_dns?.names || [];

    return {
      ...result,
      detected,
      malicious: false,
      severity: 'info',
      confidence: detected ? 0.7 : 0.3,
      categories: this.inferCategories(ports),
      tags,
      reputation: {
        score: 0,
        votes: { malicious: 0, benign: 1 },
      },
      geo: host.location ? {
        country: host.location.country || '',
        countryCode: host.location.country_code || '',
        city: host.location.city,
        region: host.location.province,
        latitude: host.location.latitude,
        longitude: host.location.longitude,
      } : undefined,
      asn: host.autonomous_system ? {
        number: host.autonomous_system.asn || 0,
        name: host.autonomous_system.description || host.autonomous_system.name || '',
        country: '',
      } : undefined,
      organization: host.autonomous_system?.description,
      openPorts: ports,
      network: {
        ports,
        services: this.extractServices(host.services || []),
        reverseDns: host.dns?.reverse_dns?.names?.[0],
      },
      firstSeen: host.metadata?.first_seen ? new Date(host.metadata.first_seen) : undefined,
      lastSeen: host.metadata?.last_seen ? new Date(host.metadata.last_seen) : undefined,
      raw: host,
    } as IPReputationResult;
  }

  private parseDomainResponse(domain: string, response: CensysSearchResult): DomainReputationResult {
    const hits = response.result?.hits || [];
    const detected = hits.length > 0;

    const result = this.createBaseResult({ type: 'domain', value: domain }, detected, false);

    const allPorts = [...new Set(hits.flatMap(h => h.services?.map(s => s.port) || []))];
    const resolvedIPs = [...new Set(hits.map(h => h.ip).filter(Boolean))];
    const names = [...new Set(hits.flatMap(h => h.dns?.reverse_dns?.names || []))];

    return {
      ...result,
      detected,
      malicious: false,
      severity: 'info',
      confidence: detected ? 0.7 : 0.3,
      categories: this.inferCategories(allPorts),
      tags: names,
      reputation: {
        score: 0,
        votes: { malicious: 0, benign: 1 },
      },
      dns: {
        a: resolvedIPs,
      },
      ssl: hits[0]?.services?.find(s => s.tls)?.tls?.server_certificates?.certificate?.parsed ? {
        valid: true,
        issuer: hits[0].services.find(s => s.tls)?.tls?.server_certificates?.certificate?.parsed?.issuer,
        expiresAt: hits[0].services.find(s => s.tls)?.tls?.server_certificates?.certificate?.parsed?.validity?.not_after 
          ? new Date(hits[0].services.find(s => s.tls)!.tls!.server_certificates!.certificate!.parsed!.validity!.not_after!) 
          : undefined,
      } : undefined,
      raw: { hits, total: response.result?.total || 0 },
    } as DomainReputationResult;
  }

  private inferCategories(ports: number[]): import('../types.js').ThreatCategory[] {
    const categories: Set<import('../types.js').ThreatCategory> = new Set();

    for (const port of ports) {
      if ([21, 22, 23, 3389, 5900].includes(port)) {
        categories.add('scanning');
      }
    }

    return Array.from(categories);
  }

  private extractServices(services: CensysHost['services']): string[] {
    return services.map(s => {
      const software = s.software?.[0];
      if (software?.product) {
        return `${s.port}/${s.transport_protocol} ${software.product}${software.version ? ' ' + software.version : ''}`;
      }
      return `${s.port}/${s.transport_protocol} ${s.service_name}`;
    });
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

  async searchHosts(query: string, perPage: number = 50, cursor?: string): Promise<CensysSearchResult> {
    const url = `${this.baseUrl}/hosts/search?q=${encodeURIComponent(query)}&per_page=${perPage}${cursor ? `&cursor=${cursor}` : ''}`;
    return this.fetchWithAuth<CensysSearchResult>(url, this.getAuthHeaders());
  }

  async viewHost(ip: string, atTime?: string): Promise<CensysHostResult> {
    const url = `${this.baseUrl}/hosts/${ip}${atTime ? `?at_time=${atTime}` : ''}`;
    return this.fetchWithAuth<CensysHostResult>(url, this.getAuthHeaders());
  }

  protected override async healthCheck(): Promise<void> {
    await this.fetchWithAuth(`${this.baseUrl}/account`, this.getAuthHeaders());
  }
}
