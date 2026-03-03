import type {
  ThreatIntelProvider,
  ThreatIntelConfig,
  ThreatIntelResult,
  AggregatedResult,
  IOCInput,
  ProviderName,
  ThreatSeverity,
  ThreatCategory,
  ThreatIntelCache,
  ThreatIntelEventHandler,
} from '../types.js';
import { SEVERITY_SCORES, CATEGORY_WEIGHTS, PROVIDER_PRIORITIES } from '../types.js';
import { VirusTotalProvider } from '../providers/virustotal.js';
import { OTXProvider } from '../providers/otx.js';
import { AbuseIPDBProvider } from '../providers/abuseipdb.js';
import { WeibudProvider } from '../providers/weibud.js';
import { ShodanProvider } from '../providers/shodan.js';
import { CensysProvider } from '../providers/censys.js';

export class ThreatIntelAggregator {
  private providers: Map<ProviderName, ThreatIntelProvider> = new Map();
  private cache?: ThreatIntelCache;
  private eventHandlers: ThreatIntelEventHandler[] = [];
  private defaultTTL = 3600000;

  constructor(options?: { cache?: ThreatIntelCache; defaultTTL?: number }) {
    this.cache = options?.cache;
    this.defaultTTL = options?.defaultTTL || 3600000;
  }

  registerProvider(config: ThreatIntelConfig): void {
    let provider: ThreatIntelProvider;

    switch (config.provider) {
      case 'virustotal':
        provider = new VirusTotalProvider(config);
        break;
      case 'otx':
        provider = new OTXProvider(config);
        break;
      case 'abuseipdb':
        provider = new AbuseIPDBProvider(config);
        break;
      case 'weibud':
        provider = new WeibudProvider(config);
        break;
      case 'shodan':
        provider = new ShodanProvider(config);
        break;
      case 'censys':
        provider = new CensysProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.providers.set(config.provider, provider);
  }

  async initialize(): Promise<void> {
    const initPromises = Array.from(this.providers.values()).map(p => p.initialize());
    await Promise.allSettled(initPromises);
  }

  setCache(cache: ThreatIntelCache): void {
    this.cache = cache;
  }

  addEventHandler(handler: ThreatIntelEventHandler): void {
    this.eventHandlers.push(handler);
  }

  removeEventHandler(handler: ThreatIntelEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index >= 0) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private emitEvent(event: Parameters<ThreatIntelEventHandler>[0]): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Intentionally ignoring handler errors to prevent one handler from breaking others
      }
    }
  }

  private getCacheKey(provider: ProviderName, ioc: IOCInput): string {
    return `${provider}:${ioc.type}:${ioc.value}`;
  }

  async querySingle(
    providerName: ProviderName,
    ioc: IOCInput
  ): Promise<ThreatIntelResult | null> {
    const provider = this.providers.get(providerName);
    if (!provider || !provider.config.enabled) {
      return null;
    }

    const cacheKey = this.getCacheKey(providerName, ioc);
    
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.emitEvent({
          type: 'cache_hit',
          provider: providerName,
          ioc,
          timestamp: new Date(),
        });
        return { ...cached, cached: true };
      }
    }

    this.emitEvent({
      type: 'cache_miss',
      provider: providerName,
      ioc,
      timestamp: new Date(),
    });

    const start = Date.now();
    try {
      const result = await provider.query(ioc);
      
      if (result && this.cache) {
        await this.cache.set(cacheKey, result, provider.config.cacheTTL || this.defaultTTL);
      }

      this.emitEvent({
        type: 'query',
        provider: providerName,
        ioc,
        timestamp: new Date(),
        duration: Date.now() - start,
      });

      return result;
    } catch (error) {
      this.emitEvent({
        type: 'error',
        provider: providerName,
        ioc,
        timestamp: new Date(),
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Query failed',
      });
      return null;
    }
  }

  async queryAll(ioc: IOCInput): Promise<AggregatedResult> {
    const providerResults = new Map<ProviderName, ThreatIntelResult>();
    
    const enabledProviders = Array.from(this.providers.entries())
      .filter(([, p]) => p.config.enabled)
      .sort((a, b) => (b[1].config.priority || 0) - (a[1].config.priority || 0));

    const queryPromises = enabledProviders.map(async ([name]) => {
      const result = await this.querySingle(name, ioc);
      if (result) {
        providerResults.set(name, result);
      }
    });

    await Promise.allSettled(queryPromises);

    return this.aggregateResults(ioc, providerResults);
  }

  private aggregateResults(
    ioc: IOCInput,
    providerResults: Map<ProviderName, ThreatIntelResult>
  ): AggregatedResult {
    const results = Array.from(providerResults.values());
    
    if (results.length === 0) {
      return this.createEmptyAggregatedResult(ioc, providerResults);
    }

    const totalWeight = results.reduce((sum, r) => {
      const providerWeight = PROVIDER_PRIORITIES[r.provider] || 5;
      return sum + providerWeight;
    }, 0);

    const weightedMaliciousScore = results.reduce((sum, r) => {
      const providerWeight = PROVIDER_PRIORITIES[r.provider] || 5;
      return sum + (r.malicious ? 1 : 0) * providerWeight;
    }, 0) / totalWeight;

    const detectedCount = results.filter(r => r.detected).length;
    const maliciousCount = results.filter(r => r.malicious).length;
    const agreement = results.length > 0 ? maliciousCount / results.length : 0;

    const consensus = {
      detected: detectedCount > 0,
      malicious: maliciousCount > results.length / 2,
      severity: this.calculateConsensusSeverity(results),
      confidence: this.calculateWeightedConfidence(results),
      agreement,
    };

    const categoryMap = new Map<ThreatCategory, { count: number; providers: ProviderName[] }>();
    for (const result of results) {
      for (const cat of result.categories) {
        const existing = categoryMap.get(cat) || { count: 0, providers: [] };
        existing.count++;
        if (!existing.providers.includes(result.provider)) {
          existing.providers.push(result.provider);
        }
        categoryMap.set(cat, existing);
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => (CATEGORY_WEIGHTS[b.category] || 0) - (CATEGORY_WEIGHTS[a.category] || 0));

    const tagMap = new Map<string, { count: number; providers: ProviderName[] }>();
    for (const result of results) {
      for (const tag of result.tags) {
        const existing = tagMap.get(tag) || { count: 0, providers: [] };
        existing.count++;
        if (!existing.providers.includes(result.provider)) {
          existing.providers.push(result.provider);
        }
        tagMap.set(tag, existing);
      }
    }

    const tags = Array.from(tagMap.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const totalMaliciousVotes = results.reduce((sum, r) => sum + (r.reputation?.votes.malicious || 0), 0);
    const totalBenignVotes = results.reduce((sum, r) => sum + (r.reputation?.votes.benign || 0), 0);
    
    const averageScore = results.reduce((sum, r) => sum + (r.reputation?.score || 0), 0) / results.length;
    
    const weightedScore = results.reduce((sum, r) => {
      const weight = PROVIDER_PRIORITIES[r.provider] || 5;
      return sum + (r.reputation?.score || 0) * weight;
    }, 0) / totalWeight;

    const firstSeenDates = results
      .map(r => r.firstSeen)
      .filter((d): d is Date => d !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());

    const lastSeenDates = results
      .map(r => r.lastSeen)
      .filter((d): d is Date => d !== undefined)
      .sort((a, b) => b.getTime() - a.getTime());

    const recommendations = this.generateRecommendations(consensus, categories, agreement);

    return {
      ioc,
      aggregatedAt: new Date(),
      consensus,
      categories,
      tags,
      reputation: {
        averageScore,
        weightedScore,
        totalVotes: { malicious: totalMaliciousVotes, benign: totalBenignVotes },
      },
      firstSeenGlobally: firstSeenDates[0],
      lastSeenGlobally: lastSeenDates[0],
      providerResults,
      recommendations,
    };
  }

  private calculateConsensusSeverity(results: ThreatIntelResult[]): ThreatSeverity {
    const severityScores: Record<ThreatSeverity, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
      info: 10,
      clean: 0,
    };

    const weightedSum = results.reduce((sum, r) => {
      const weight = PROVIDER_PRIORITIES[r.provider] || 5;
      const score = severityScores[r.severity] || 0;
      return sum + score * weight;
    }, 0);

    const totalWeight = results.reduce((sum, r) => sum + (PROVIDER_PRIORITIES[r.provider] || 5), 0);
    const avgScore = weightedSum / totalWeight;

    if (avgScore >= 85) return 'critical';
    if (avgScore >= 60) return 'high';
    if (avgScore >= 40) return 'medium';
    if (avgScore >= 20) return 'low';
    if (avgScore > 0) return 'info';
    return 'clean';
  }

  private calculateWeightedConfidence(results: ThreatIntelResult[]): number {
    const weightedSum = results.reduce((sum, r) => {
      const weight = PROVIDER_PRIORITIES[r.provider] || 5;
      return sum + r.confidence * weight;
    }, 0);

    const totalWeight = results.reduce((sum, r) => sum + (PROVIDER_PRIORITIES[r.provider] || 5), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private generateRecommendations(
    consensus: AggregatedResult['consensus'],
    categories: AggregatedResult['categories'],
    _agreement: number
  ): AggregatedResult['recommendations'] {
    const recommendations: AggregatedResult['recommendations'] = [];

    if (consensus.severity === 'critical' || consensus.severity === 'high') {
      recommendations.push({
        action: 'block',
        reason: `High-confidence malicious indicator with ${Math.round(consensus.confidence * 100)}% confidence`,
        confidence: consensus.confidence,
      });
    } else if (consensus.severity === 'medium') {
      recommendations.push({
        action: 'monitor',
        reason: 'Suspicious activity detected, recommend monitoring',
        confidence: consensus.confidence,
      });
    } else if (consensus.severity === 'low') {
      recommendations.push({
        action: 'investigate',
        reason: 'Low-confidence indicator, investigate context before action',
        confidence: consensus.confidence,
      });
    } else {
      recommendations.push({
        action: 'allow',
        reason: 'No malicious activity detected',
        confidence: 1 - consensus.confidence,
      });
    }

    if (categories.some(c => c.category === 'apt')) {
      recommendations.push({
        action: 'block',
        reason: 'APT-related threat detected, immediate action required',
        confidence: 0.95,
      });
    }

    if (categories.some(c => c.category === 'phishing')) {
      recommendations.push({
        action: 'block',
        reason: 'Phishing indicator detected, block to prevent credential theft',
        confidence: 0.9,
      });
    }

    return recommendations;
  }

  private createEmptyAggregatedResult(
    ioc: IOCInput,
    providerResults: Map<ProviderName, ThreatIntelResult>
  ): AggregatedResult {
    return {
      ioc,
      aggregatedAt: new Date(),
      consensus: {
        detected: false,
        malicious: false,
        severity: 'clean',
        confidence: 0,
        agreement: 0,
      },
      categories: [],
      tags: [],
      reputation: {
        averageScore: 0,
        weightedScore: 0,
        totalVotes: { malicious: 0, benign: 0 },
      },
      providerResults,
      recommendations: [{
        action: 'allow',
        reason: 'No threat intelligence data available',
        confidence: 0.5,
      }],
    };
  }

  async getProviderHealth(): Promise<Map<ProviderName, { healthy: boolean; latency?: number; error?: string }>> {
    const healthResults = new Map<ProviderName, { healthy: boolean; latency?: number; error?: string }>();

    const healthPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      const health = await provider.getHealth();
      healthResults.set(name, health);
    });

    await Promise.allSettled(healthPromises);
    return healthResults;
  }

  getProvider(name: ProviderName): ThreatIntelProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }
}

export function createThreatIntelAggregator(options?: {
  cache?: ThreatIntelCache;
  defaultTTL?: number;
}): ThreatIntelAggregator {
  return new ThreatIntelAggregator(options);
}
