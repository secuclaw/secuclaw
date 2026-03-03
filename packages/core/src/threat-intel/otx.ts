import type { ThreatIntelConnector, ThreatIntelResult, IoC, OTXConfig } from "./types.js";

export class OTXConnector implements ThreatIntelConnector {
  readonly name = "otx" as const;
  readonly enabled: boolean;
  
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: OTXConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://otx.alienvault.com";
    this.timeout = config.timeout ?? 30000;
    this.enabled = !!this.apiKey;
  }

  async ping(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/user/me`, {
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
      source: "otx",
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
      const endpoint = this.getEndpoint(ioc);
      const response = await fetch(`${this.baseUrl}/api/v1/indicators/${endpoint}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return { ...baseResult, raw: { error: `HTTP ${response.status}` } };
      }

      const data = await response.json() as OTXResponse;
      
      const pulseCount = data.pulse_info?.count ?? 0;
      const pulses = data.pulse_info?.pulses ?? [];
      
      if (pulseCount === 0) {
        return baseResult;
      }

      const tags = new Set<string>();
      const malwareFamilies = new Set<string>();
      const campaigns = new Set<string>();
      const actors = new Set<string>();
      const references: Array<{ title: string; url: string }> = [];

      for (const pulse of pulses) {
        if (pulse.name) {
          references.push({
            title: pulse.name,
            url: `https://otx.alienvault.com/pulse/${pulse.id}`,
          });
        }
        for (const tag of pulse.tags ?? []) {
          tags.add(tag);
          if (tag.toLowerCase().includes("apt") || tag.toLowerCase().includes("actor")) {
            actors.add(tag);
          }
        }
        for (const malware of pulse.malware_families ?? []) {
          malwareFamilies.add(malware);
        }
        for (const ref of pulse.references ?? []) {
          if (typeof ref === "string") {
            references.push({ title: ref, url: ref });
          }
        }
      }

      const confidence = Math.min(pulseCount * 15 + (data.reputation ?? 0) * 10, 100);

      return {
        source: "otx",
        ioc,
        malicious: pulseCount > 0 || (data.reputation ?? 0) < 0,
        confidence,
        tags: Array.from(tags).slice(0, 20),
        threatTypes: this.detectThreatTypes(data),
        malwareFamilies: Array.from(malwareFamilies),
        campaigns: Array.from(campaigns),
        actors: Array.from(actors),
        references: references.slice(0, 10),
        raw: { 
          pulseCount,
          reputation: data.reputation,
          baseIndicator: data.base_indicator,
        },
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
      "X-OTX-API-KEY": this.apiKey,
      "Accept": "application/json",
    };
  }

  private getEndpoint(ioc: IoC): string {
    const type = ioc.type;
    const value = encodeURIComponent(ioc.value);
    
    const endpoints: Record<IoC["type"], string> = {
      ip: `ip/${value}/general`,
      domain: `domain/${value}/general`,
      url: `url/${value}/general`,
      hash_md5: `file/${value}/general`,
      hash_sha1: `file/${value}/general`,
      hash_sha256: `file/${value}/general`,
      email: `email/${value}/general`,
      cve: `cve/${value}/general`,
    };
    
    return endpoints[type] ?? `ip/${value}/general`;
  }

  private detectThreatTypes(data: OTXResponse): string[] {
    const types: string[] = [];
    
    if ((data.reputation ?? 0) < 0) {
      types.push("malicious");
    }
    
    const pulses = data.pulse_info?.pulses ?? [];
    for (const pulse of pulses) {
      const name = (pulse.name ?? "").toLowerCase();
      if (name.includes("phishing")) types.push("phishing");
      if (name.includes("malware")) types.push("malware");
      if (name.includes("ransomware")) types.push("ransomware");
      if (name.includes("c2") || name.includes("command")) types.push("c2");
      if (name.includes("spam")) types.push("spam");
      if (name.includes("ddos")) types.push("ddos");
    }
    
    return [...new Set(types)];
  }
}

interface OTXResponse {
  reputation?: number;
  pulse_info?: {
    count?: number;
    pulses?: Array<{
      id?: string;
      name?: string;
      tags?: string[];
      malware_families?: string[];
      references?: string[];
    }>;
  };
  base_indicator?: Record<string, unknown>;
}

export function createOTXConnector(config: OTXConfig): ThreatIntelConnector {
  return new OTXConnector(config);
}
