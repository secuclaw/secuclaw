import type { KnowledgeGraph, GraphNode, GraphEdge } from "../ontology/graph.js";
import { emitEvent } from "../events/stream.js";
import { auditLog } from "../audit/logger.js";

export interface RiskScore {
  overall: number;
  likelihood: number;
  impact: number;
  confidence: number;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface AttackChain {
  id: string;
  name: string;
  steps: AttackChainStep[];
  totalRisk: number;
  mitreTechniques: string[];
  mitreTactics: string[];
}

export interface AttackChainStep {
  order: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  action: string;
  riskContribution: number;
}

export interface RiskPropagation {
  sourceId: string;
  targetId: string;
  path: string[];
  riskTransfer: number;
  linkType: string;
}

export interface RiskSummary {
  totalAssets: number;
  atRiskAssets: number;
  criticalAssets: number;
  topRisks: Array<{ id: string; name: string; score: number }>;
  attackChains: AttackChain[];
  coverage: number;
  recommendations: string[];
}

class RiskGraphEngine {
  private riskCache: Map<string, RiskScore> = new Map();
  private attackChainCache: Map<string, AttackChain[]> = new Map();

  calculateRisk(node: GraphNode, graph: KnowledgeGraph): RiskScore {
    const cached = this.riskCache.get(node.id);
    if (cached) return cached;

    const factors: RiskFactor[] = [];
    let likelihood = 0.5;
    let impact = 0.5;

    const incomingThreats = this.countIncomingType(node.id, "threat", graph);
    const incomingVulns = this.countIncomingType(node.id, "vulnerability", graph);
    const outgoingControls = this.countOutgoingType(node.id, "control", graph);

    factors.push({
      name: "threat_exposure",
      weight: 0.3,
      score: Math.min(incomingThreats * 0.2, 1),
      description: `Exposed to ${incomingThreats} threat(s)`,
    });

    factors.push({
      name: "vulnerability_count",
      weight: 0.25,
      score: Math.min(incomingVulns * 0.15, 1),
      description: `Has ${incomingVulns} vulnerability(ies)`,
    });

    factors.push({
      name: "control_coverage",
      weight: 0.2,
      score: Math.max(0, 1 - outgoingControls * 0.1),
      description: `Protected by ${outgoingControls} control(s)`,
    });

    const severity = node.metadata.severity as string | undefined;
    const severityScore = this.severityToScore(severity);
    factors.push({
      name: "intrinsic_severity",
      weight: 0.15,
      score: severityScore,
      description: `Severity: ${severity || "unknown"}`,
    });

    const assetValue = (node.metadata.assetValue as number) || 0.5;
    factors.push({
      name: "asset_value",
      weight: 0.1,
      score: assetValue,
      description: `Asset value: ${assetValue}`,
    });

    for (const factor of factors) {
      likelihood += factor.score * factor.weight * 0.5;
      impact += factor.score * factor.weight * 0.5;
    }

    likelihood = Math.min(Math.max(likelihood, 0), 1);
    impact = Math.min(Math.max(impact, 0), 1);

    const overall = likelihood * 0.4 + impact * 0.6;
    const confidence = factors.reduce((sum, f) => sum + f.weight, 0);

    const score: RiskScore = {
      overall,
      likelihood,
      impact,
      confidence,
      factors,
    };

    this.riskCache.set(node.id, score);
    return score;
  }

  private severityToScore(severity: string | undefined): number {
    const scores: Record<string, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.3,
      info: 0.1,
    };
    return scores[(severity || "").toLowerCase()] || 0.3;
  }

  private countIncomingType(nodeId: string, type: string, graph: KnowledgeGraph): number {
    const edges = graph.getIncomingEdges(nodeId);
    return edges.filter((e) => {
      const source = graph.getNode(e.source);
      return source?.type === type;
    }).length;
  }

  private countOutgoingType(nodeId: string, type: string, graph: KnowledgeGraph): number {
    const edges = graph.getOutgoingEdges(nodeId);
    return edges.filter((e) => {
      const target = graph.getNode(e.target);
      return target?.type === type;
    }).length;
  }

  identifyAttackChains(graph: KnowledgeGraph, maxDepth: number = 5): AttackChain[] {
    const chains: AttackChain[] = [];
    const threats = graph.getNodesByType("threat");

    for (const threat of threats) {
      const assetTargets = graph.getNodesByType("asset");
      
      for (const asset of assetTargets) {
        const paths = graph.findPaths(threat.id, asset.id, maxDepth);
        
        for (const path of paths) {
          const chain = this.buildAttackChain(path.nodes, path.edges, graph);
          if (chain) {
            chains.push(chain);
          }
        }
      }
    }

    chains.sort((a, b) => b.totalRisk - a.totalRisk);
    return chains.slice(0, 20);
  }

  private buildAttackChain(
    nodes: GraphNode[],
    edges: GraphEdge[],
    _graph: KnowledgeGraph
  ): AttackChain | null {
    if (nodes.length < 2) return null;

    const steps: AttackChainStep[] = [];
    let totalRisk = 0;
    const techniques: Set<string> = new Set();
    const tactics: Set<string> = new Set();

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const edge = edges[i];
      
      const riskScore = this.calculateRisk(node, _graph);
      totalRisk += riskScore.overall;

      if (node.metadata.mitreTechnique) {
        techniques.add(node.metadata.mitreTechnique as string);
      }
      if (node.metadata.mitreTactic) {
        tactics.add(node.metadata.mitreTactic as string);
      }

      steps.push({
        order: i,
        nodeId: node.id,
        nodeName: node.label,
        nodeType: node.type,
        action: edge?.linkType || "unknown",
        riskContribution: riskScore.overall,
      });
    }

    return {
      id: `chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${nodes[0].label} → ${nodes[nodes.length - 1].label}`,
      steps,
      totalRisk: totalRisk / nodes.length,
      mitreTechniques: Array.from(techniques),
      mitreTactics: Array.from(tactics),
    };
  }

  propagateRisk(sourceId: string, graph: KnowledgeGraph, depth: number = 3): RiskPropagation[] {
    const propagations: RiskPropagation[] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[]; transfer: number; depth: number }> = [
      { id: sourceId, path: [sourceId], transfer: 1.0, depth: 0 },
    ];

    const sourceScore = this.riskCache.get(sourceId)?.overall || 0.5;

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.id) || current.depth > depth) continue;
      visited.add(current.id);

      const outgoing = graph.getOutgoingEdges(current.id);
      
      for (const edge of outgoing) {
        const targetId = edge.target;
        if (visited.has(targetId)) continue;

        const transferRate = this.getTransferRate(edge.linkType);
        const riskTransfer = current.transfer * transferRate * sourceScore;

        if (riskTransfer > 0.01) {
          propagations.push({
            sourceId,
            targetId,
            path: [...current.path, targetId],
            riskTransfer,
            linkType: edge.linkType,
          });

          queue.push({
            id: targetId,
            path: [...current.path, targetId],
            transfer: riskTransfer,
            depth: current.depth + 1,
          });
        }
      }
    }

    return propagations;
  }

  private getTransferRate(linkType: string): number {
    const rates: Record<string, number> = {
      exploits: 0.9,
      depends_on: 0.7,
      transmits: 0.6,
      contains: 0.5,
      belongs_to: 0.4,
      mitigates: 0.1,
    };
    return rates[linkType] || 0.3;
  }

  generateSummary(graph: KnowledgeGraph, sessionId: string): RiskSummary {
    const runId = `risk-${Date.now()}`;
    
    emitEvent("reasoning.start", runId, sessionId, {
      action: "generate_risk_summary",
    });

    const assets = graph.getNodesByType("asset");
    const threats = graph.getNodesByType("threat");
    const vulnerabilities = graph.getNodesByType("vulnerability");
    const controls = graph.getNodesByType("control");

    const assetRisks: Array<{ id: string; name: string; score: number }> = [];
    let atRiskCount = 0;
    let criticalCount = 0;

    for (const asset of assets) {
      const risk = this.calculateRisk(asset, graph);
      assetRisks.push({ id: asset.id, name: asset.label, score: risk.overall });
      
      if (risk.overall > 0.5) atRiskCount++;
      if (risk.overall > 0.8) criticalCount++;
    }

    assetRisks.sort((a, b) => b.score - a.score);
    const topRisks = assetRisks.slice(0, 10);

    const attackChains = this.identifyAttackChains(graph);

    const coverage = vulnerabilities.length > 0
      ? controls.length / vulnerabilities.length
      : 1;

    const recommendations = this.generateRecommendations(topRisks, attackChains);

    const summary: RiskSummary = {
      totalAssets: assets.length,
      atRiskAssets: atRiskCount,
      criticalAssets: criticalCount,
      topRisks,
      attackChains,
      coverage: Math.min(coverage, 1),
      recommendations,
    };

    emitEvent("reasoning.result", runId, sessionId, {
      action: "generate_risk_summary",
      summary,
    });

    auditLog("reasoning.result", "risk_summary", { summary }, { sessionId, source: "risk_graph" });

    return summary;
  }

  private generateRecommendations(
    topRisks: Array<{ id: string; name: string; score: number }>,
    attackChains: AttackChain[]
  ): string[] {
    const recommendations: string[] = [];

    for (const risk of topRisks.slice(0, 3)) {
      recommendations.push(`Address high-risk asset: ${risk.name} (score: ${risk.score.toFixed(2)})`);
    }

    if (attackChains.length > 0) {
      const topChain = attackChains[0];
      recommendations.push(
        `Break attack chain: ${topChain.name} - focus on ${topChain.steps[0].nodeName}`
      );
    }

    if (topRisks.some((r) => r.score > 0.8)) {
      recommendations.push("Consider implementing additional monitoring for critical assets");
    }

    return recommendations;
  }

  clearCache(): void {
    this.riskCache.clear();
    this.attackChainCache.clear();
  }
}

export const riskGraphEngine = new RiskGraphEngine();

export function calculateNodeRisk(node: GraphNode, graph: KnowledgeGraph): RiskScore {
  return riskGraphEngine.calculateRisk(node, graph);
}

export function findAttackChains(graph: KnowledgeGraph, maxDepth?: number): AttackChain[] {
  return riskGraphEngine.identifyAttackChains(graph, maxDepth);
}

export function propagateRiskFromSource(sourceId: string, graph: KnowledgeGraph, depth?: number): RiskPropagation[] {
  return riskGraphEngine.propagateRisk(sourceId, graph, depth);
}

export function generateRiskSummary(graph: KnowledgeGraph, sessionId: string): RiskSummary {
  return riskGraphEngine.generateSummary(graph, sessionId);
}
