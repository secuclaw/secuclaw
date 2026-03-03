import type { ThreatIntelConnector, ThreatIntelResult, IoC } from "../threat-intel/types.js";

export interface TAXIIConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
  collection?: string;
  timeout?: number;
}

export interface STIXObject {
  type: string;
  id: string;
  created?: string;
  modified?: string;
  name?: string;
  description?: string;
  labels?: string[];
  pattern?: string;
  indicator_types?: string[];
  object_marking_refs?: string[];
}

export interface TAXIICollection {
  id: string;
  title: string;
  description?: string;
  can_read: boolean;
  can_write: boolean;
}

export interface TAXIIEnvelope {
  type: string;
  id: string;
  spec_version: string;
  objects: STIXObject[];
}

export class TAXIIClient implements ThreatIntelConnector {
  readonly name = "taxii" as const;
  readonly enabled: boolean;

  private baseUrl: string;
  private username?: string;
  private password?: string;
  private apiKey?: string;
  private collection?: string;
  private timeout: number;

  constructor(config: TAXIIConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.username = config.username;
    this.password = config.password;
    this.apiKey = config.apiKey;
    this.collection = config.collection;
    this.timeout = config.timeout ?? 30000;
    this.enabled = !!(this.baseUrl);
  }

  async ping(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/taxii2/`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCollections(): Promise<TAXIICollection[]> {
    const response = await fetch(`${this.baseUrl}/taxii2/collections/`, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`TAXII error: ${response.status}`);
    }

    const data = await response.json() as { collections?: TAXIICollection[] };
    return data.collections ?? [];
  }

  async getObjects(collectionId?: string, options?: {
    addedAfter?: string;
    type?: string;
    limit?: number;
  }): Promise<STIXObject[]> {
    const cid = collectionId ?? this.collection;
    if (!cid) {
      throw new Error("No collection specified");
    }

    const params = new URLSearchParams();
    if (options?.addedAfter) params.set("added_after", options.addedAfter);
    if (options?.type) params.set("match[type]", options.type);
    if (options?.limit) params.set("limit", String(options.limit));

    const queryString = params.toString();
    const url = `${this.baseUrl}/taxii2/collections/${cid}/objects/${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`TAXII error: ${response.status}`);
    }

    const data = await response.json() as TAXIIEnvelope;
    return data.objects ?? [];
  }

  async searchIndicators(query: string): Promise<STIXObject[]> {
    const objects = await this.getObjects(undefined, { type: "indicator" });
    
    const q = query.toLowerCase();
    return objects.filter(obj =>
      obj.name?.toLowerCase().includes(q) ||
      obj.description?.toLowerCase().includes(q) ||
      obj.pattern?.toLowerCase().includes(q) ||
      obj.labels?.some(l => l.toLowerCase().includes(q))
    );
  }

  async query(ioc: IoC): Promise<ThreatIntelResult> {
    const baseResult: ThreatIntelResult = {
      source: "taxii",
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
      const indicators = await this.searchIndicators(ioc.value);
      
      if (indicators.length === 0) {
        return baseResult;
      }

      const tags = new Set<string>();
      const threatTypes = new Set<string>();
      const references: Array<{ title: string; url: string }> = [];

      for (const indicator of indicators) {
        if (indicator.labels) {
          indicator.labels.forEach(l => tags.add(l));
        }
        if (indicator.indicator_types) {
          indicator.indicator_types.forEach(t => threatTypes.add(t));
        }
        if (indicator.name) {
          references.push({
            title: indicator.name,
            url: `${this.baseUrl}/taxii2/objects/${indicator.id}`,
          });
        }
      }

      const confidence = Math.min(indicators.length * 25, 100);

      return {
        source: "taxii",
        ioc,
        malicious: indicators.length > 0,
        confidence,
        tags: Array.from(tags),
        threatTypes: Array.from(threatTypes),
        malwareFamilies: [],
        campaigns: [],
        actors: [],
        references: references.slice(0, 10),
        raw: { indicatorCount: indicators.length, indicators: indicators.slice(0, 5) },
        fetchedAt: new Date(),
      };
    } catch (error) {
      return {
        ...baseResult,
        raw: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Accept": "application/taxii+json;version=2.1",
      "Content-Type": "application/taxii+json;version=2.1",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else if (this.username && this.password) {
      const credentials = btoa(`${this.username}:${this.password}`);
      headers["Authorization"] = `Basic ${credentials}`;
    }

    return headers;
  }
}

export function createTAXIIClient(config: TAXIIConfig): ThreatIntelConnector {
  return new TAXIIClient(config);
}
