import type { ThreatIntelConnector, ThreatIntelResult, IoC, MISPConfig } from "./types.js";

export class MISPConnector implements ThreatIntelConnector {
  readonly name = "misp" as const;
  readonly enabled: boolean;
  
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: MISPConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.enabled = !!(this.baseUrl && this.apiKey);
  }

  async ping(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/servers/getVersion`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async query(ioc: IoC): Promise<ThreatIntelResult> {
    const baseResult: ThreatIntelResult = {
      source: "misp",
      ioc,
      malicious: false,
      confidence: 0,
      tags: [],
      threatTypes: [],
      malwareFamilies: [],
      campaigns: [],
      actors: [],
      references: [],
      fetchedAt: new Date(),
    };

    if (!this.enabled) return baseResult;

    try {
      const searchType = this.mapIoCType(ioc.type);
      const response = await fetch(`${this.baseUrl}/attributes/restSearch/${searchType}/${encodeURIComponent(ioc.value)}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return { ...baseResult, raw: { error: `HTTP ${response.status}` } };
      }

      const data = await response.json() as { 
        response?: { 
          Attribute?: Array<{
            Event?: { info?: string; id?: string; orgc?: string };
            category?: string;
            type?: string;
            comment?: string;
            Tag?: Array<{ name?: string }>;
          }> 
        } 
      };

      const attributes = data.response?.Attribute ?? [];
      
      if (attributes.length === 0) {
        return baseResult;
      }

      const tags = new Set<string>();
      const threatTypes = new Set<string>();
      const malwareFamilies = new Set<string>();
      const campaigns = new Set<string>();

      for (const attr of attributes) {
        if (attr.category) threatTypes.add(attr.category);
        if (attr.Event?.info) {
          const info = attr.Event.info.toLowerCase();
          if (info.includes("apt") || info.includes("campaign")) {
            campaigns.add(attr.Event.info);
          }
          if (info.includes("malware") || info.includes("ransomware")) {
            malwareFamilies.add(attr.Event.info);
          }
        }
        for (const tag of attr.Tag ?? []) {
          if (tag.name) {
            tags.add(tag.name);
            if (tag.name.startsWith("misp-galaxy:")) {
              const parts = tag.name.split("=");
              if (parts.length > 1) {
                malwareFamilies.add(parts[1].replace(/"/g, ""));
              }
            }
          }
        }
      }

      const confidence = Math.min(attributes.length * 20, 100);

      return {
        source: "misp",
        ioc,
        malicious: attributes.length > 0,
        confidence,
        tags: Array.from(tags),
        threatTypes: Array.from(threatTypes),
        malwareFamilies: Array.from(malwareFamilies),
        campaigns: Array.from(campaigns),
        actors: [],
        references: attributes.slice(0, 5).map(a => ({
          title: a.Event?.info ?? "MISP Event",
          url: a.Event?.id ? `${this.baseUrl}/events/view/${a.Event.id}` : "",
        })),
        raw: { attributeCount: attributes.length },
        fetchedAt: new Date(),
      };
    } catch (error) {
      return { 
        ...baseResult, 
        raw: { error: error instanceof Error ? error.message : "Unknown error" } 
      };
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Authorization": this.apiKey,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
  }

  private mapIoCType(type: IoC["type"]): string {
    const mapping: Record<IoC["type"], string> = {
      ip: "ip-src",
      domain: "domain",
      url: "url",
      hash_md5: "md5",
      hash_sha1: "sha1",
      hash_sha256: "sha256",
      email: "email-src",
      cve: "vulnerability",
    };
    return mapping[type] ?? type;
  }
}

export function createMISPConnector(config: MISPConfig): ThreatIntelConnector {
  return new MISPConnector(config);
}
