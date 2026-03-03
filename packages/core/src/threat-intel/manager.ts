import type { ThreatIntelConnector, ThreatIntelResult, IoC, ThreatIntelSource, ThreatIntelManagerConfig } from "./types.js";
import { createMISPConnector, MISPConnector } from "./misp.js";
import { createOTXConnector, OTXConnector } from "./otx.js";

export class ThreatIntelManager {
  private connectors: Map<ThreatIntelSource, ThreatIntelConnector> = new Map();
  private cache: Map<string, { result: ThreatIntelResult; expires: number }> = new Map();
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private parallelQueries: boolean;

  constructor(config: ThreatIntelManagerConfig = {}) {
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTTL = config.cacheTTL ?? 3600000;
    this.parallelQueries = config.parallelQueries ?? true;

    if (config.connectors?.misp?.apiKey) {
      this.register(createMISPConnector(config.connectors!.misp));
    }
    if (config.connectors?.otx?.apiKey) {
      this.register(createOTXConnector(config.connectors!.otx));
    }

    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    if (process.env.MISP_API_KEY && process.env.MISP_BASE_URL) {
      this.register(createMISPConnector({
        apiKey: process.env.MISP_API_KEY,
        baseUrl: process.env.MISP_BASE_URL,
      }));
    }
    if (process.env.OTX_API_KEY) {
      this.register(createOTXConnector({
        apiKey: process.env.OTX_API_KEY,
      }));
    }
  }

  register(connector: ThreatIntelConnector): void {
    this.connectors.set(connector.name, connector);
  }

  get(name: ThreatIntelSource): ThreatIntelConnector | undefined {
    return this.connectors.get(name);
  }

  list(): ThreatIntelSource[] {
    return Array.from(this.connectors.keys());
  }

  listEnabled(): ThreatIntelSource[] {
    return Array.from(this.connectors.entries())
      .filter(([_, c]) => c.enabled)
      .map(([name]) => name);
  }

  async query(
    ioc: IoC, 
    sources?: ThreatIntelSource[]
  ): Promise<Map<ThreatIntelSource, ThreatIntelResult>> {
    const cacheKey = `${ioc.type}:${ioc.value}`;
    
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return new Map([[cached.result.source, cached.result]]);
      }
    }

    const activeConnectors = sources
      ? (sources.map(s => this.connectors.get(s)).filter(Boolean) as ThreatIntelConnector[])
      : Array.from(this.connectors.values()).filter(c => c.enabled);

    const results = new Map<ThreatIntelSource, ThreatIntelResult>();

    if (this.parallelQueries) {
      const promises = activeConnectors.map(async (connector) => {
        try {
          const result = await connector.query(ioc);
          results.set(connector.name, result);
        } catch (error) {
          results.set(connector.name, {
            source: connector.name,
            ioc,
            malicious: false,
            confidence: 0,
            tags: [],
            threatTypes: [],
            malwareFamilies: [],
            campaigns: [],
            actors: [],
            references: [],
            raw: { error: error instanceof Error ? error.message : "Unknown error" },
            fetchedAt: new Date(),
          });
        }
      });
      await Promise.allSettled(promises);
    } else {
      for (const connector of activeConnectors) {
        try {
          const result = await connector.query(ioc);
          results.set(connector.name, result);
        } catch (error) {
          results.set(connector.name, {
            source: connector.name,
            ioc,
            malicious: false,
            confidence: 0,
            tags: [],
            threatTypes: [],
            malwareFamilies: [],
            campaigns: [],
            actors: [],
            references: [],
            raw: { error: error instanceof Error ? error.message : "Unknown error" },
            fetchedAt: new Date(),
          });
        }
      }
    }

    if (this.cacheEnabled && results.size > 0) {
      const firstResult = results.values().next().value;
      if (firstResult) {
        this.cache.set(cacheKey, {
          result: firstResult,
          expires: Date.now() + this.cacheTTL,
        });
      }
    }

    return results;
  }

  async queryAggregated(ioc: IoC, sources?: ThreatIntelSource[]): Promise<AggregatedThreatIntel> {
    const results = await this.query(ioc, sources);
    const resultsArray = Array.from(results.values());

    const maliciousVotes = resultsArray.filter(r => r.malicious).length;
    const totalVotes = resultsArray.length;
    
    const allTags = new Set<string>();
    const allThreatTypes = new Set<string>();
    const allMalwareFamilies = new Set<string>();
    const allCampaigns = new Set<string>();
    const allActors = new Set<string>();
    const allReferences: Array<{ title: string; url: string }> = [];

    for (const result of resultsArray) {
      result.tags.forEach(t => allTags.add(t));
      result.threatTypes.forEach(t => allThreatTypes.add(t));
      result.malwareFamilies.forEach(m => allMalwareFamilies.add(m));
      result.campaigns.forEach(c => allCampaigns.add(c));
      result.actors.forEach(a => allActors.add(a));
      allReferences.push(...result.references);
    }

    const avgConfidence = resultsArray.length > 0
      ? resultsArray.reduce((sum, r) => sum + r.confidence, 0) / resultsArray.length
      : 0;

    return {
      ioc,
      malicious: maliciousVotes > totalVotes / 2,
      confidence: avgConfidence,
      consensus: totalVotes > 0 ? maliciousVotes / totalVotes : 0,
      sourcesQueried: totalVotes,
      sourcesMalicious: maliciousVotes,
      tags: Array.from(allTags),
      threatTypes: Array.from(allThreatTypes),
      malwareFamilies: Array.from(allMalwareFamilies),
      campaigns: Array.from(allCampaigns),
      actors: Array.from(allActors),
      references: allReferences.slice(0, 20),
      details: resultsArray,
      fetchedAt: new Date(),
    };
  }

  async pingAll(): Promise<Map<ThreatIntelSource, boolean>> {
    const results = new Map<ThreatIntelSource, boolean>();
    
    await Promise.allSettled(
      Array.from(this.connectors.entries()).map(async ([name, connector]) => {
        results.set(name, await connector.ping());
      })
    );

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export interface AggregatedThreatIntel {
  ioc: IoC;
  malicious: boolean;
  confidence: number;
  consensus: number;
  sourcesQueried: number;
  sourcesMalicious: number;
  tags: string[];
  threatTypes: string[];
  malwareFamilies: string[];
  campaigns: string[];
  actors: string[];
  references: Array<{ title: string; url: string }>;
  details: ThreatIntelResult[];
  fetchedAt: Date;
}

let managerInstance: ThreatIntelManager | null = null;

export function getThreatIntelManager(): ThreatIntelManager {
  if (!managerInstance) {
    managerInstance = new ThreatIntelManager();
  }
  return managerInstance;
}

export function resetThreatIntelManager(): void {
  managerInstance = null;
}

export { MISPConnector, OTXConnector };
