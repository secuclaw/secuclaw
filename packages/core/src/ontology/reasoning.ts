import type { OntologyObject, OntologyLink, ObjectType, LinkType, SeverityLevel, StatusLevel } from "./types.js";
import type { GraphNode, GraphEdge } from "./graph.js";
import { severityOrder, statusOrder } from "./schema.js";

export interface RiskScore {
  likelihood: number;
  impact: number;
  overall: number;
  factors: RiskFactor[];
}

export interface RiskFactor {
  type: "vulnerability" | "threat" | "control" | "asset";
  id: string;
  name: string;
  contribution: number;
  description: string;
}

export interface AttackChain {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalRisk: number;
  entryPoints: string[];
  targets: string[];
}

export interface MitigationRecommendation {
  controlId: string;
  controlName: string;
  effectiveness: number;
  coverage: number;
  gaps: string[];
}

export interface Inference {
  type: "risk" | "mitigation" | "attack_path" | "correlation";
  confidence: number;
  evidence: string[];
  result: unknown;
}

export class ReasoningEngine {
  private graph: import("./graph.js").KnowledgeGraph;

  constructor(graph: import("./graph.js").KnowledgeGraph) {
    this.graph = graph;
  }

  calculateRiskScore(assetId: string): RiskScore {
    const asset = this.graph.getNode(assetId);
    if (!asset) {
      return { likelihood: 0, impact: 0, overall: 0, factors: [] };
    }

    const factors: RiskFactor[] = [];
    let likelihoodSum = 0;
    let impactSum = 0;

    const linkedVulnerabilities = this.findLinkedEntities(assetId, "vulnerability", ["exploits"]);
    for (const vuln of linkedVulnerabilities) {
      const cvssScore = (vuln.object as import("./types.js").Vulnerability).cvss_score ?? 5.0;
      const contribution = cvssScore / 10;
      likelihoodSum += contribution * 100;
      factors.push({
        type: "vulnerability",
        id: vuln.id,
        name: vuln.label,
        contribution,
        description: `Vulnerability with CVSS ${cvssScore}`,
      });
    }

    const linkedThreats = this.findLinkedEntities(assetId, "threat", ["exploits"]);
    for (const threat of linkedThreats) {
      const severity = threat.object.severity;
      const severityValue = severity ? severityOrder[severity] : 3;
      const contribution = severityValue / 5;
      likelihoodSum += contribution * 50;
      factors.push({
        type: "threat",
        id: threat.id,
        name: threat.label,
        contribution,
        description: `Threat with ${severity ?? "unknown"} severity`,
      });
    }

    const linkedControls = this.findLinkedEntities(assetId, "control", ["mitigates"]);
    let controlEffectiveness = 0;
    for (const control of linkedControls) {
      const effectiveness = (control.object as import("./types.js").Control).effectiveness;
      if (effectiveness === "effective") {
        controlEffectiveness += 0.3;
      } else if (effectiveness === "partial") {
        controlEffectiveness += 0.15;
      }
    }

    const criticality = (asset.object as import("./types.js").Asset).criticality ?? 50;
    impactSum = criticality;

    const mitigatedLikelihood = Math.max(0, likelihoodSum * (1 - controlEffectiveness));
    const overall = (mitigatedLikelihood * impactSum) / 100;

    return {
      likelihood: Math.min(100, mitigatedLikelihood),
      impact: Math.min(100, impactSum),
      overall: Math.min(100, overall),
      factors,
    };
  }

  findLinkedEntities(sourceId: string, targetType: ObjectType, linkTypes?: LinkType[]): GraphNode[] {
    const neighbors = this.graph.findNeighbors(sourceId, linkTypes, 2);
    const filtered: GraphNode[] = [];
    for (const node of neighbors.values()) {
      if (node.type === targetType) {
        filtered.push(node);
      }
    }
    return filtered;
  }

  identifyAttackChains(targetAssetId: string): AttackChain[] {
    const threatNodes = this.graph.getNodesByType("threat");
    const chains: AttackChain[] = [];

    for (const threat of threatNodes) {
      const paths = this.graph.findPaths(threat.id, targetAssetId, 5);
      for (const path of paths) {
        if (path.nodes.length < 2) continue;

        const entryPoints = path.nodes
          .filter((n) => n.type === "threat" || n.type === "actor")
          .map((n) => n.id);
        const targets = [targetAssetId];

        let totalRisk = 0;
        for (const node of path.nodes) {
          if (node.object.severity) {
            totalRisk += severityOrder[node.object.severity];
          }
        }

        chains.push({
          id: `chain-${threat.id}-${targetAssetId}-${Date.now()}`,
          nodes: path.nodes,
          edges: path.edges,
          totalRisk,
          entryPoints,
          targets,
        });
      }
    }

    return chains.sort((a, b) => b.totalRisk - a.totalRisk);
  }

  recommendMitigations(targetId: string): MitigationRecommendation[] {
    const vulnerabilities = this.findLinkedEntities(targetId, "vulnerability", ["exploits"]);
    const threats = this.findLinkedEntities(targetId, "threat", ["exploits"]);

    const recommendations: MitigationRecommendation[] = [];
    const existingControls = this.findLinkedEntities(targetId, "control", ["mitigates"]);

    for (const vuln of vulnerabilities) {
      const potentialControls = this.graph.getNodesByType("control");
      const applicableControls = potentialControls.filter((c) => {
        const edges = this.graph.getOutgoingEdges(c.id);
        return edges.some((e) => e.target === vuln.id);
      });

      const coveredThreats = new Set<string>();
      for (const control of applicableControls) {
        const controlEdges = this.graph.getOutgoingEdges(control.id);
        for (const edge of controlEdges) {
          if (edge.linkType === "mitigates") {
            coveredThreats.add(edge.target);
          }
        }
      }

      const effectiveness = applicableControls.length > 0 ? 0.7 : 0;
      const coverage = threats.length > 0 ? coveredThreats.size / threats.length : 1;

      const gaps: string[] = [];
      if (applicableControls.length === 0) {
        gaps.push("No controls mitigating this vulnerability");
      }
      for (const threat of threats) {
        if (!coveredThreats.has(threat.id)) {
          gaps.push(`Not protected against: ${threat.label}`);
        }
      }

      recommendations.push({
        controlId: applicableControls[0]?.id ?? "",
        controlName: applicableControls[0]?.label ?? "New control needed",
        effectiveness,
        coverage,
        gaps,
      });
    }

    return recommendations.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  inferCorrelations(entityId: string): Inference[] {
    const inferences: Inference[] = [];
    const entity = this.graph.getNode(entityId);
    if (!entity) return inferences;

    const neighbors = this.graph.findNeighbors(entityId, undefined, 2);
    const sameTypeNodes = this.graph.getNodesByType(entity.type);

    const correlatedIds = new Set<string>();
    for (const node of sameTypeNodes) {
      if (node.id === entityId) continue;
      const theirNeighbors = this.graph.findNeighbors(node.id, undefined, 1);
      for (const neighbor of neighbors.values()) {
        if (theirNeighbors.has(neighbor.id)) {
          correlatedIds.add(node.id);
        }
      }
    }

    if (correlatedIds.size > 0) {
      const evidence = Array.from(correlatedIds).map((id) => {
        const n = this.graph.getNode(id);
        return n ? `${n.type}:${n.label}` : id;
      });

      inferences.push({
        type: "correlation",
        confidence: Math.min(0.9, 0.3 + correlatedIds.size * 0.1),
        evidence,
        result: Array.from(correlatedIds),
      });
    }

    if (entity.type === "vulnerability") {
      const linkedAssets = this.findLinkedEntities(entityId, "asset", ["belongs-to", "contains"]);
      if (linkedAssets.length > 0) {
        inferences.push({
          type: "risk",
          confidence: 0.85,
          evidence: linkedAssets.map((a) => a.label),
          result: {
            exposedAssets: linkedAssets.length,
            severity: entity.object.severity ?? "unknown",
          },
        });
      }
    }

    if (entity.type === "control") {
      const mitigatedVulns = this.graph.getOutgoingEdges(entity.id).filter((e) => e.linkType === "mitigates");
      inferences.push({
        type: "mitigation",
        confidence: 0.9,
        evidence: mitigatedVulns.map((e) => {
          const n = this.graph.getNode(e.target);
          return n?.label ?? e.target;
        }),
        result: {
          mitigatedCount: mitigatedVulns.length,
        },
      });
    }

    return inferences;
  }

  identifyCriticalAssets(): GraphNode[] {
    const assets = this.graph.getNodesByType("asset");
    const scored = assets.map((asset) => {
      const riskScore = this.calculateRiskScore(asset.id);
      return { node: asset, score: riskScore.overall };
    });

    return scored
      .filter((s) => s.score > 50)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.node);
  }

  calculateControlCoverage(): Record<string, number> {
    const controls = this.graph.getNodesByType("control");
    const vulnerabilities = this.graph.getNodesByType("vulnerability");
    const threats = this.graph.getNodesByType("threat");

    const coverage: Record<string, number> = {
      vulnerability: 0,
      threat: 0,
    };

    for (const vuln of vulnerabilities) {
      const mitigatingControls = this.graph.getIncomingEdges(vuln.id).filter((e) => e.linkType === "mitigates");
      if (mitigatingControls.length > 0) {
        coverage.vulnerability++;
      }
    }

    for (const threat of threats) {
      const mitigatingControls = this.graph.getIncomingEdges(threat.id).filter((e) => e.linkType === "mitigates");
      if (mitigatingControls.length > 0) {
        coverage.threat++;
      }
    }

    if (vulnerabilities.length > 0) {
      coverage.vulnerability = (coverage.vulnerability / vulnerabilities.length) * 100;
    }
    if (threats.length > 0) {
      coverage.threat = (coverage.threat / threats.length) * 100;
    }

    return coverage;
  }
}
