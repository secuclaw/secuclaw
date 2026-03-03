import type {
  AttackChain,
  TraceNode,
  TraceEdge,
  TraceGraph,
  TraceStatistics,
  TraceDashboard,
  TraceNodeSeverity,
  TraceNodeType,
  TraceNodeStatus,
  TraceAsset,
  TraceIndicator,
  TraceEvidence,
  TraceSource,
  TraceRelationship,
  AttackTraceQuery,
  CorrelationRule,
  TraceEnrichment,
  CorrelationCondition,
  EnrichmentData,
  TraceTimelineEvent,
  TraceNote,
  AttackerProfile,
  ImpactAssessment,
  TraceStatus,
} from './types.js';

export class AttackTraceEngine {
  private chains: Map<string, AttackChain> = new Map();
  private nodes: Map<string, TraceNode> = new Map();
  private edges: Map<string, TraceEdge> = new Map();
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private eventHandlers: TraceEventHandler[] = [];

  constructor() {
    this.registerDefaultCorrelationRules();
  }

  private registerDefaultCorrelationRules(): void {
    const rules: CorrelationRule[] = [
      {
        id: 'rule_lateral_movement',
        name: 'Lateral Movement Detection',
        description: 'Detects lateral movement patterns across hosts',
        enabled: true,
        conditions: [
          { field: 'nodeType', operator: 'in', value: ['lateral_movement', 'authentication'] },
          { field: 'assetType', operator: 'equals', value: 'host' },
        ],
        timeWindow: 3600000,
        minMatches: 3,
        severity: 'high',
      },
      {
        id: 'rule_data_exfil',
        name: 'Data Exfiltration Pattern',
        description: 'Detects potential data exfiltration activities',
        enabled: true,
        conditions: [
          { field: 'nodeType', operator: 'equals', value: 'exfiltration' },
          { field: 'dataVolume', operator: 'gt', value: 10000000 },
        ],
        timeWindow: 1800000,
        minMatches: 1,
        severity: 'critical',
      },
      {
        id: 'rule_privilege_escalation',
        name: 'Privilege Escalation Detection',
        description: 'Detects privilege escalation attempts',
        enabled: true,
        conditions: [
          { field: 'nodeType', operator: 'equals', value: 'privilege_escalation' },
          { field: 'targetPrivilege', operator: 'in', value: ['admin', 'root', 'system'] },
        ],
        timeWindow: 600000,
        minMatches: 1,
        severity: 'critical',
      },
    ];

    for (const rule of rules) {
      this.correlationRules.set(rule.id, rule);
    }
  }

  createChain(options: {
    name: string;
    description?: string;
    initialNode?: Partial<TraceNode>;
    attacker?: Partial<AttackerProfile>;
    tags?: string[];
  }): AttackChain {
    const chainId = this.generateId('chain');
    const now = new Date();

    const chain: AttackChain = {
      id: chainId,
      name: options.name,
      description: options.description || '',
      status: 'investigating',
      nodes: [],
      edges: [],
      attacker: {
        type: options.attacker?.type || 'unknown',
        sophistication: options.attacker?.sophistication || 'unknown',
        aliases: options.attacker?.aliases || [],
        associatedGroups: options.attacker?.associatedGroups || [],
        ttps: options.attacker?.ttps || [],
        ...options.attacker,
      },
      firstActivityAt: now,
      lastActivityAt: now,
      impact: {
        overallSeverity: 'medium',
        affectedAssetsCount: 0,
        dataCompromised: false,
        dataTypesCompromised: [],
        businessImpact: 'moderate',
        regulatoryImpact: [],
      },
      timeline: [{
        id: this.generateId('event'),
        timestamp: now,
        nodeId: '',
        type: 'detection',
        description: 'Attack chain created',
      }],
      notes: [],
      createdAt: now,
      updatedAt: now,
      tags: options.tags || [],
    };

    if (options.initialNode) {
      const node = this.createNode(chainId, options.initialNode);
      chain.nodes.push(node);
      chain.firstActivityAt = node.timestamp;
    }

    this.chains.set(chainId, chain);
    this.emit('chain_created', chain);
    return chain;
  }

  createNode(chainId: string, options: Partial<TraceNode>): TraceNode {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    const nodeId = this.generateId('node');
    const node: TraceNode = {
      id: nodeId,
      type: options.type || 'execution',
      name: options.name || 'Unknown Activity',
      description: options.description || '',
      timestamp: options.timestamp || new Date(),
      severity: options.severity || 'medium',
      status: options.status || 'suspected',
      confidence: options.confidence || 0.5,
      asset: options.asset || {
        type: 'host',
        identifier: 'unknown',
        criticality: 'medium',
      },
      indicators: options.indicators || [],
      mitreTactics: options.mitreTactics || [],
      mitreTechniques: options.mitreTechniques || [],
      evidence: options.evidence || [],
      source: options.source || { type: 'manual', name: 'manual' },
      metadata: options.metadata || {},
    };

    this.nodes.set(nodeId, node);
    chain.nodes.push(node);
    chain.lastActivityAt = node.timestamp;
    chain.updatedAt = new Date();

    if (node.timestamp < chain.firstActivityAt) {
      chain.firstActivityAt = node.timestamp;
    }

    chain.timeline.push({
      id: this.generateId('event'),
      timestamp: new Date(),
      nodeId: node.id,
      type: 'detection',
      description: `Node added: ${node.name}`,
    });

    this.updateChainImpact(chain);
    this.emit('node_created', { chain, node });
    return node;
  }

  createEdge(chainId: string, options: {
    sourceNodeId: string;
    targetNodeId: string;
    relationship: TraceRelationship;
    confidence?: number;
    evidence?: TraceEvidence[];
    metadata?: Record<string, unknown>;
  }): TraceEdge {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    const sourceNode = chain.nodes.find(n => n.id === options.sourceNodeId);
    const targetNode = chain.nodes.find(n => n.id === options.targetNodeId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found in chain');
    }

    const edgeId = this.generateId('edge');
    const edge: TraceEdge = {
      id: edgeId,
      sourceNodeId: options.sourceNodeId,
      targetNodeId: options.targetNodeId,
      relationship: options.relationship,
      timestamp: new Date(),
      confidence: options.confidence || 0.7,
      evidence: options.evidence || [],
      metadata: options.metadata || {},
    };

    this.edges.set(edgeId, edge);
    chain.edges.push(edge);
    chain.updatedAt = new Date();

    this.emit('edge_created', { chain, edge });
    return edge;
  }

  linkToExistingNode(
    chainId: string,
    newNodeOptions: Partial<TraceNode>,
    existingNodeId: string,
    relationship: TraceRelationship
  ): { node: TraceNode; edge: TraceEdge } {
    const newNode = this.createNode(chainId, newNodeOptions);
    const edge = this.createEdge(chainId, {
      sourceNodeId: existingNodeId,
      targetNodeId: newNode.id,
      relationship,
    });

    return { node: newNode, edge };
  }

  addEvidence(nodeId: string, evidence: Omit<TraceEvidence, 'id'>): TraceEvidence {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const fullEvidence: TraceEvidence = {
      id: this.generateId('evidence'),
      ...evidence,
    };

    node.evidence.push(fullEvidence);

    const chain = this.findChainByNode(nodeId);
    if (chain) {
      chain.updatedAt = new Date();
    }

    this.emit('evidence_added', { node, evidence: fullEvidence });
    return fullEvidence;
  }

  addIndicator(nodeId: string, indicator: TraceIndicator): TraceNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    node.indicators.push(indicator);

    const chain = this.findChainByNode(nodeId);
    if (chain) {
      chain.updatedAt = new Date();
    }

    this.emit('indicator_added', { node, indicator });
    return node;
  }

  addNote(chainId: string, options: {
    content: string;
    createdBy: string;
    type: 'observation' | 'hypothesis' | 'action' | 'conclusion';
  }): TraceNote {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    const note: TraceNote = {
      id: this.generateId('note'),
      content: options.content,
      createdBy: options.createdBy,
      createdAt: new Date(),
      type: options.type,
    };

    chain.notes.push(note);
    chain.updatedAt = new Date();

    chain.timeline.push({
      id: this.generateId('event'),
      timestamp: new Date(),
      nodeId: '',
      type: 'note',
      description: options.content,
      userId: options.createdBy,
    });

    this.emit('note_added', { chain, note });
    return note;
  }

  updateNodeStatus(nodeId: string, status: TraceNodeStatus): TraceNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    node.status = status;

    const chain = this.findChainByNode(nodeId);
    if (chain) {
      chain.updatedAt = new Date();
      chain.timeline.push({
        id: this.generateId('event'),
        timestamp: new Date(),
        nodeId: node.id,
        type: 'analysis',
        description: `Node status updated to: ${status}`,
      });
    }

    this.emit('node_updated', { node, status });
    return node;
  }

  updateChainStatus(chainId: string, status: TraceStatus): AttackChain {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    chain.status = status;
    chain.updatedAt = new Date();

    chain.timeline.push({
      id: this.generateId('event'),
      timestamp: new Date(),
      nodeId: '',
      type: status === 'contained' ? 'containment' :
             status === 'resolved' ? 'recovery' : 'analysis',
      description: `Chain status updated to: ${status}`,
    });

    this.emit('chain_updated', { chain, status });
    return chain;
  }

  enrichNode(nodeId: string, enrichments: Omit<EnrichmentData, 'enrichedAt'>[]): TraceEnrichment {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const fullEnrichments: EnrichmentData[] = enrichments.map(e => ({
      ...e,
      enrichedAt: new Date(),
    }));

    for (const enrichment of fullEnrichments) {
      if (enrichment.type === 'threat_intel') {
        const tiData = enrichment.data as { reputation?: string; tags?: string[] };
        if (tiData.reputation === 'malicious') {
          node.confidence = Math.min(1, node.confidence + 0.2);
        }
        if (tiData.tags && Array.isArray(tiData.tags)) {
          node.indicators.forEach(ind => {
            if (!ind.threatIntel) {
              ind.threatIntel = {
                source: enrichment.source,
                reputation: 'suspicious',
                tags: [],
              };
            }
            ind.threatIntel.tags = [...new Set([...ind.threatIntel.tags, ...tiData.tags as string[]])];
          });
        }
      }
    }

    const chain = this.findChainByNode(nodeId);
    if (chain) {
      chain.updatedAt = new Date();
    }

    const result: TraceEnrichment = {
      nodeId,
      enrichments: fullEnrichments,
    };

    this.emit('node_enriched', { node, enrichments: fullEnrichments });
    return result;
  }

  correlate(chainId: string): TraceNode[][] {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    const correlatedGroups: TraceNode[][] = [];

    for (const rule of this.correlationRules.values()) {
      if (!rule.enabled) continue;

      const matchingNodes = chain.nodes.filter(node => {
        return this.evaluateRuleConditions(rule, node);
      });

      if (matchingNodes.length >= rule.minMatches) {
        const timeWindowStart = new Date(Date.now() - rule.timeWindow);
        const recentMatches = matchingNodes.filter(n => n.timestamp >= timeWindowStart);

        if (recentMatches.length >= rule.minMatches) {
          correlatedGroups.push(recentMatches);
        }
      }
    }

    return correlatedGroups;
  }

  private evaluateRuleConditions(rule: CorrelationRule, node: TraceNode): boolean {
    for (const condition of rule.conditions) {
      const value = this.getNodeFieldValue(node, condition.field);
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }
    return true;
  }

  private getNodeFieldValue(node: TraceNode, field: string): unknown {
    const fieldMap: Record<string, unknown> = {
      nodeType: node.type,
      severity: node.severity,
      status: node.status,
      confidence: node.confidence,
      assetType: node.asset.type,
      assetIdentifier: node.asset.identifier,
    };

    return fieldMap[field] ?? node.metadata[field];
  }

  private evaluateCondition(value: unknown, condition: CorrelationCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'matches':
        return new RegExp(String(condition.value)).test(String(value));
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'in':
        return Array.isArray(condition.value) && (condition.value as unknown[]).includes(value);
      default:
        return false;
    }
  }

  getGraph(chainId: string): TraceGraph {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Attack chain not found: ${chainId}`);
    }

    const statistics = this.calculateStatistics(chain);

    return {
      nodes: chain.nodes,
      edges: chain.edges,
      statistics,
    };
  }

  query(query: AttackTraceQuery): AttackChain[] {
    let chains = Array.from(this.chains.values());

    if (query.timeRange) {
      chains = chains.filter(c =>
        c.firstActivityAt >= query.timeRange!.start &&
        c.lastActivityAt <= query.timeRange!.end
      );
    }

    if (query.nodeTypes && query.nodeTypes.length > 0) {
      chains = chains.filter(c =>
        c.nodes.some(n => query.nodeTypes!.includes(n.type))
      );
    }

    if (query.severities && query.severities.length > 0) {
      chains = chains.filter(c =>
        c.nodes.some(n => query.severities!.includes(n.severity))
      );
    }

    if (query.assetIdentifiers && query.assetIdentifiers.length > 0) {
      chains = chains.filter(c =>
        c.nodes.some(n => query.assetIdentifiers!.includes(n.asset.identifier))
      );
    }

    if (query.mitreTactics && query.mitreTactics.length > 0) {
      chains = chains.filter(c =>
        c.nodes.some(n =>
          n.mitreTactics.some(t => query.mitreTactics!.includes(t))
        )
      );
    }

    if (query.textSearch) {
      const searchLower = query.textSearch.toLowerCase();
      chains = chains.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.nodes.some(n =>
          n.name.toLowerCase().includes(searchLower) ||
          n.description.toLowerCase().includes(searchLower)
        )
      );
    }

    return chains;
  }

  getChain(chainId: string): AttackChain | undefined {
    return this.chains.get(chainId);
  }

  getNode(nodeId: string): TraceNode | undefined {
    return this.nodes.get(nodeId);
  }

  getDashboard(): TraceDashboard {
    const chains = Array.from(this.chains.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeTraces = chains.filter(c =>
      c.status === 'active' || c.status === 'investigating'
    );

    const tracesByStatus: Record<TraceStatus, number> = {
      active: 0,
      contained: 0,
      resolved: 0,
      false_positive: 0,
      investigating: 0,
    };

    const tracesBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const mitreHeatmap: Record<string, number> = {};
    const indicatorCounts: Map<string, { type: string; count: number }> = new Map();

    for (const chain of chains) {
      tracesByStatus[chain.status]++;
      tracesBySeverity[chain.impact.overallSeverity]++;

      for (const node of chain.nodes) {
        for (const tactic of node.mitreTactics) {
          mitreHeatmap[tactic] = (mitreHeatmap[tactic] || 0) + 1;
        }

        for (const indicator of node.indicators) {
          const key = indicator.value;
          const existing = indicatorCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            indicatorCounts.set(key, { type: indicator.type, count: 1 });
          }
        }
      }
    }

    const topIndicators = Array.from(indicatorCounts.entries())
      .map(([indicator, data]) => ({ indicator, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const containedChains = chains.filter(c =>
      c.status === 'contained' || c.status === 'resolved'
    );

    const avgTimeToContain = containedChains.length > 0
      ? containedChains.reduce((sum, c) => {
          const containEvent = c.timeline.find(e => e.type === 'containment');
          if (containEvent) {
            return sum + (containEvent.timestamp.getTime() - c.firstActivityAt.getTime());
          }
          return sum;
        }, 0) / containedChains.length / 3600000
      : 0;

    return {
      activeTraces: activeTraces.length,
      tracesByStatus,
      tracesBySeverity,
      recentTraces: chains
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 10),
      topIndicators,
      mitreHeatmap,
      avgTimeToContain,
    };
  }

  private findChainByNode(nodeId: string): AttackChain | undefined {
    return Array.from(this.chains.values()).find(c =>
      c.nodes.some(n => n.id === nodeId)
    );
  }

  private updateChainImpact(chain: AttackChain): void {
    const uniqueAssets = new Set(chain.nodes.map(n => n.asset.identifier));
    chain.impact.affectedAssetsCount = uniqueAssets.size;

    const hasDataAccess = chain.nodes.some(n =>
      n.type === 'data_access' || n.type === 'exfiltration'
    );
    chain.impact.dataCompromised = hasDataAccess;

    const severities: TraceNodeSeverity[] = ['critical', 'high', 'medium', 'low'];
    let maxSeverityIndex = 3;
    for (const node of chain.nodes) {
      const index = severities.indexOf(node.severity);
      if (index < maxSeverityIndex) {
        maxSeverityIndex = index;
      }
    }
    chain.impact.overallSeverity = severities[maxSeverityIndex] as 'critical' | 'high' | 'medium' | 'low';

    if (chain.impact.overallSeverity === 'critical') {
      chain.impact.businessImpact = 'severe';
    } else if (chain.impact.overallSeverity === 'high') {
      chain.impact.businessImpact = 'significant';
    } else if (chain.impact.overallSeverity === 'medium') {
      chain.impact.businessImpact = 'moderate';
    } else {
      chain.impact.businessImpact = 'minor';
    }
  }

  private calculateStatistics(chain: AttackChain): TraceStatistics {
    const nodesByType: Record<TraceNodeType, number> = {} as Record<TraceNodeType, number>;
    const nodesBySeverity: Record<TraceNodeSeverity, number> = {} as Record<TraceNodeSeverity, number>;
    const tacticsMap: Record<string, number> = {};
    const techniquesMap: Record<string, number> = {};

    for (const node of chain.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      nodesBySeverity[node.severity] = (nodesBySeverity[node.severity] || 0) + 1;

      for (const tactic of node.mitreTactics) {
        tacticsMap[tactic] = (tacticsMap[tactic] || 0) + 1;
      }
      for (const technique of node.mitreTechniques) {
        techniquesMap[technique] = (techniquesMap[technique] || 0) + 1;
      }
    }

    const avgConfidence = chain.nodes.length > 0
      ? chain.nodes.reduce((sum, n) => sum + n.confidence, 0) / chain.nodes.length
      : 0;

    const attackDuration = chain.lastActivityAt.getTime() - chain.firstActivityAt.getTime();

    const timeline: { timestamp: Date; count: number }[] = [];
    const hourBuckets = new Map<string, number>();
    for (const node of chain.nodes) {
      const hour = new Date(node.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1);
    }
    for (const [timestamp, count] of hourBuckets) {
      timeline.push({ timestamp: new Date(timestamp), count });
    }
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      totalNodes: chain.nodes.length,
      totalEdges: chain.edges.length,
      nodesByType,
      nodesBySeverity,
      timeline,
      mitreCoverage: {
        tactics: tacticsMap,
        techniques: techniquesMap,
      },
      avgConfidence,
      attackDuration,
    };
  }

  addEventHandler(handler: TraceEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(eventType: string, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(eventType, data);
      } catch {
        // Intentionally ignoring handler errors to prevent cascading failures
      }
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `trace_${prefix}_${timestamp}_${random}`;
  }
}

export type TraceEventHandler = (eventType: string, data: unknown) => void | Promise<void>;

export function createAttackTraceEngine(): AttackTraceEngine {
  return new AttackTraceEngine();
}
