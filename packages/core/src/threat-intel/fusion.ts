import type { ThreatIntelResult, IoC, ThreatIntelSource } from './types.js';

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  sources: ThreatIntelSource[];
  conditions: CorrelationCondition[];
  weight: number;
}

export interface CorrelationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'greaterThan' | 'lessThan';
  value?: string | number | RegExp;
}

export interface CorrelationResult {
  ioc: IoC;
  correlatedWith: Array<{
    ioc: IoC;
    relationship: string;
    confidence: number;
    sources: ThreatIntelSource[];
  }>;
  threatCluster?: ThreatCluster;
  riskScore: number;
  confidence: number;
}

export interface ThreatCluster {
  id: string;
  name: string;
  type: 'campaign' | 'actor' | 'malware' | 'infrastructure';
  members: IoC[];
  commonIndicators: string[];
  sources: ThreatIntelSource[];
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
}

export interface FusionConfig {
  minSourcesForCorrelation: number;
  confidenceThreshold: number;
  maxClusterSize: number;
  decayFactor: number;
}

export const DEFAULT_FUSION_CONFIG: FusionConfig = {
  minSourcesForCorrelation: 2,
  confidenceThreshold: 0.5,
  maxClusterSize: 100,
  decayFactor: 0.1,
};

export class IntelligenceFusion {
  private config: FusionConfig;
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private iocGraph: Map<string, Set<string>> = new Map();
  private clusters: Map<string, ThreatCluster> = new Map();
  private resultsCache: Map<string, ThreatIntelResult[]> = new Map();

  constructor(config: Partial<FusionConfig> = {}) {
    this.config = { ...DEFAULT_FUSION_CONFIG, ...config };
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.addCorrelationRule({
      id: 'same-malware-family',
      name: 'Same Malware Family',
      description: 'IOCs associated with the same malware family',
      sources: ['misp', 'otx', 'taxii'],
      conditions: [
        { field: 'malwareFamilies', operator: 'exists' },
      ],
      weight: 0.8,
    });

    this.addCorrelationRule({
      id: 'same-campaign',
      name: 'Same Campaign',
      description: 'IOCs associated with the same threat campaign',
      sources: ['misp', 'otx', 'taxii'],
      conditions: [
        { field: 'campaigns', operator: 'exists' },
      ],
      weight: 0.9,
    });

    this.addCorrelationRule({
      id: 'same-actor',
      name: 'Same Threat Actor',
      description: 'IOCs attributed to the same threat actor',
      sources: ['misp', 'otx', 'taxii'],
      conditions: [
        { field: 'actors', operator: 'exists' },
      ],
      weight: 0.95,
    });

    this.addCorrelationRule({
      id: 'high-confidence-malicious',
      name: 'High Confidence Malicious',
      description: 'Multiple sources confirm malicious behavior',
      sources: ['misp', 'otx', 'taxii'],
      conditions: [
        { field: 'malicious', operator: 'equals', value: 1 },
        { field: 'confidence', operator: 'greaterThan', value: 70 },
      ],
      weight: 0.85,
    });
  }

  addCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.set(rule.id, rule);
  }

  removeCorrelationRule(ruleId: string): boolean {
    return this.correlationRules.delete(ruleId);
  }

  ingestResults(results: ThreatIntelResult[]): void {
    for (const result of results) {
      const key = `${result.ioc.type}:${result.ioc.value}`;
      
      if (!this.resultsCache.has(key)) {
        this.resultsCache.set(key, []);
      }
      this.resultsCache.get(key)!.push(result);

      this.updateIOCGraph(result);
    }
  }

  private updateIOCGraph(result: ThreatIntelResult): void {
    const iocKey = `${result.ioc.type}:${result.ioc.value}`;

    for (const tag of result.tags) {
      const tagKey = `tag:${tag}`;
      this.addEdge(iocKey, tagKey);
    }

    for (const family of result.malwareFamilies) {
      const familyKey = `family:${family}`;
      this.addEdge(iocKey, familyKey);
    }

    for (const campaign of result.campaigns) {
      const campaignKey = `campaign:${campaign}`;
      this.addEdge(iocKey, campaignKey);
    }

    for (const actor of result.actors) {
      const actorKey = `actor:${actor}`;
      this.addEdge(iocKey, actorKey);
    }
  }

  private addEdge(node1: string, node2: string): void {
    if (!this.iocGraph.has(node1)) {
      this.iocGraph.set(node1, new Set());
    }
    if (!this.iocGraph.has(node2)) {
      this.iocGraph.set(node2, new Set());
    }
    this.iocGraph.get(node1)!.add(node2);
    this.iocGraph.get(node2)!.add(node1);
  }

  findCorrelations(ioc: IoC): CorrelationResult {
    const iocKey = `${ioc.type}:${ioc.value}`;
    const results = this.resultsCache.get(iocKey) ?? [];

    const correlatedIOCs: CorrelationResult['correlatedWith'] = [];

    const neighbors = this.iocGraph.get(iocKey);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (neighbor.startsWith('ioc:')) continue;

        const neighborNeighbors = this.iocGraph.get(neighbor);
        if (neighborNeighbors) {
          for (const nn of neighborNeighbors) {
            if (nn !== iocKey && nn.includes(':')) {
              const [type, ...valueParts] = nn.split(':');
              const value = valueParts.join(':');

              if (type !== 'tag' && type !== 'family' && type !== 'campaign' && type !== 'actor') {
                const confidence = this.calculateRelationshipConfidence(neighbor);
                correlatedIOCs.push({
                  ioc: { type: type as IoC['type'], value },
                  relationship: neighbor,
                  confidence,
                  sources: this.getSourcesForIOC(nn),
                });
              }
            }
          }
        }
      }
    }

    const uniqueCorrelations = this.deduplicateCorrelations(correlatedIOCs);

    const cluster = this.findOrCreateCluster(ioc, uniqueCorrelations);

    const riskScore = this.calculateRiskScore(results, uniqueCorrelations);
    const confidence = this.calculateOverallConfidence(results);

    return {
      ioc,
      correlatedWith: uniqueCorrelations.slice(0, 20),
      threatCluster: cluster,
      riskScore,
      confidence,
    };
  }

  private deduplicateCorrelations(
    correlations: CorrelationResult['correlatedWith']
  ): CorrelationResult['correlatedWith'] {
    const seen = new Map<string, CorrelationResult['correlatedWith'][0]>();

    for (const c of correlations) {
      const key = `${c.ioc.type}:${c.ioc.value}`;
      const existing = seen.get(key);
      if (!existing || c.confidence > existing.confidence) {
        seen.set(key, c);
      }
    }

    return Array.from(seen.values());
  }

  private calculateRelationshipConfidence(relationship: string): number {
    if (relationship.startsWith('actor:')) return 0.95;
    if (relationship.startsWith('campaign:')) return 0.9;
    if (relationship.startsWith('family:')) return 0.8;
    if (relationship.startsWith('tag:')) return 0.5;
    return 0.6;
  }

  private getSourcesForIOC(iocKey: string): ThreatIntelSource[] {
    const results = this.resultsCache.get(iocKey);
    if (!results) return [];
    return [...new Set(results.map(r => r.source))];
  }

  private findOrCreateCluster(
    ioc: IoC,
    correlations: CorrelationResult['correlatedWith']
  ): ThreatCluster | undefined {
    if (correlations.length === 0) return undefined;

    const relatedIOCs = correlations.map(c => c.ioc);
    const allIOCs = [ioc, ...relatedIOCs];

    const commonIndicators = this.findCommonIndicators(allIOCs);

    const cluster: ThreatCluster = {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: commonIndicators[0] ?? 'Unknown Cluster',
      type: this.inferClusterType(commonIndicators),
      members: allIOCs.slice(0, this.config.maxClusterSize),
      commonIndicators,
      sources: [...new Set(correlations.flatMap(c => c.sources))],
      firstSeen: new Date(),
      lastSeen: new Date(),
      confidence: Math.max(...correlations.map(c => c.confidence)),
    };

    this.clusters.set(cluster.id, cluster);
    return cluster;
  }

  private findCommonIndicators(iocs: IoC[]): string[] {
    const indicatorCounts = new Map<string, number>();

    for (const ioc of iocs) {
      const key = `${ioc.type}:${ioc.value}`;
      const results = this.resultsCache.get(key) ?? [];

      for (const result of results) {
        for (const tag of result.tags) {
          indicatorCounts.set(tag, (indicatorCounts.get(tag) ?? 0) + 1);
        }
        for (const family of result.malwareFamilies) {
          indicatorCounts.set(family, (indicatorCounts.get(family) ?? 0) + 1);
        }
        for (const campaign of result.campaigns) {
          indicatorCounts.set(campaign, (indicatorCounts.get(campaign) ?? 0) + 1);
        }
      }
    }

    const threshold = Math.max(2, iocs.length * 0.3);
    return Array.from(indicatorCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([indicator]) => indicator);
  }

  private inferClusterType(indicators: string[]): ThreatCluster['type'] {
    const lower = indicators.map(i => i.toLowerCase()).join(' ');
    
    if (lower.includes('apt') || lower.includes('threat group')) return 'actor';
    if (lower.includes('campaign') || lower.includes('operation')) return 'campaign';
    if (lower.includes('malware') || lower.includes('ransomware') || lower.includes('trojan')) return 'malware';
    return 'infrastructure';
  }

  private calculateRiskScore(
    results: ThreatIntelResult[],
    correlations: CorrelationResult['correlatedWith']
  ): number {
    let score = 0;

    const maliciousCount = results.filter(r => r.malicious).length;
    score += Math.min(maliciousCount * 20, 40);

    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;
    score += (avgConfidence / 100) * 30;

    const correlationScore = Math.min(correlations.length * 3, 30);
    score += correlationScore;

    return Math.min(score, 100);
  }

  private calculateOverallConfidence(results: ThreatIntelResult[]): number {
    if (results.length === 0) return 0;

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const sourceDiversity = new Set(results.map(r => r.source)).size;
    const diversityBonus = Math.min(sourceDiversity * 5, 20);

    return Math.min(avgConfidence + diversityBonus, 100);
  }

  getClusters(): ThreatCluster[] {
    return Array.from(this.clusters.values());
  }

  getCluster(id: string): ThreatCluster | undefined {
    return this.clusters.get(id);
  }

  getClusterByIOC(ioc: IoC): ThreatCluster | undefined {
    const iocKey = `${ioc.type}:${ioc.value}`;
    
    for (const cluster of this.clusters.values()) {
      if (cluster.members.some(m => `${m.type}:${m.value}` === iocKey)) {
        return cluster;
      }
    }
    return undefined;
  }

  getGraphStats(): {
    nodes: number;
    edges: number;
    avgConnections: number;
  } {
    let totalConnections = 0;
    for (const connections of this.iocGraph.values()) {
      totalConnections += connections.size;
    }

    return {
      nodes: this.iocGraph.size,
      edges: totalConnections / 2,
      avgConnections: this.iocGraph.size > 0 ? totalConnections / this.iocGraph.size : 0,
    };
  }

  clear(): void {
    this.iocGraph.clear();
    this.clusters.clear();
    this.resultsCache.clear();
  }
}

export function createIntelligenceFusion(config?: Partial<FusionConfig>): IntelligenceFusion {
  return new IntelligenceFusion(config);
}
