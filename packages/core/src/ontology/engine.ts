import type { OntologyObject, OntologyLink, OntologyAction, ObjectType, LinkType, ActionType, STIXObject } from "./types.js";
import { KnowledgeGraph, type GraphNode, type GraphEdge, type GraphQuery, type STIXBundle } from "./graph.js";
import { ReasoningEngine, type RiskScore, type AttackChain, type MitigationRecommendation, type Inference } from "./reasoning.js";
import { isValidLink, isValidAction, objectTypeDefinitions, linkTypeDefinitions, actionTypeDefinitions } from "./schema.js";

export interface OntologyConfig {
  enableReasoning: boolean;
  autoIndex: boolean;
  maxPathDepth: number;
}

export interface EntitySearchResult {
  id: string;
  type: ObjectType;
  name: string;
  score: number;
  highlights: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OntologyEngine {
  private graph: KnowledgeGraph;
  private reasoning: ReasoningEngine;
  private config: OntologyConfig;

  constructor(config: Partial<OntologyConfig> = {}) {
    this.config = {
      enableReasoning: config.enableReasoning ?? true,
      autoIndex: config.autoIndex ?? true,
      maxPathDepth: config.maxPathDepth ?? 10,
    };
    this.graph = new KnowledgeGraph();
    this.reasoning = new ReasoningEngine(this.graph);
  }

  addEntity(object: OntologyObject): GraphNode | null {
    if (!object.id || !object.type || !object.name) {
      throw new Error("Invalid entity: missing required fields");
    }

    const typeDef = objectTypeDefinitions[object.type as ObjectType];
    if (!typeDef) {
      throw new Error(`Unknown object type: ${object.type}`);
    }

    return this.graph.addNode(object);
  }

  addRelationship(link: OntologyLink): GraphEdge | null {
    if (!link.id || !link.source_ref || !link.target_ref || !link.link_type) {
      throw new Error("Invalid link: missing required fields");
    }

    const sourceNode = this.graph.getNode(link.source_ref);
    const targetNode = this.graph.getNode(link.target_ref);

    if (!sourceNode || !targetNode) {
      throw new Error("Link source or target not found in graph");
    }

    if (!isValidLink(sourceNode.type, targetNode.type, link.link_type)) {
      throw new Error(`Invalid link: ${link.link_type} not allowed from ${sourceNode.type} to ${targetNode.type}`);
    }

    return this.graph.addLink(link);
  }

  performAction(action: OntologyAction): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!action.id || !action.action_type || action.object_refs.length === 0) {
      errors.push("Invalid action: missing required fields");
      return { valid: false, errors, warnings };
    }

    for (const objectRef of action.object_refs) {
      const entity = this.graph.getNode(objectRef);
      if (!entity) {
        errors.push(`Object ${objectRef} not found`);
        continue;
      }

      if (!isValidAction(action.action_type, entity.type)) {
        warnings.push(`Action ${action.action_type} may not be applicable to ${entity.type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getEntity(id: string): GraphNode | undefined {
    return this.graph.getNode(id);
  }

  getEntitiesByType(type: ObjectType): GraphNode[] {
    return this.graph.getNodesByType(type);
  }

  getRelationships(nodeId: string): { outgoing: GraphEdge[]; incoming: GraphEdge[] } {
    return {
      outgoing: this.graph.getOutgoingEdges(nodeId),
      incoming: this.graph.getIncomingEdges(nodeId),
    };
  }

  findPaths(sourceId: string, targetId: string): import("./graph.js").PathResult[] {
    return this.graph.findPaths(sourceId, targetId, this.config.maxPathDepth);
  }

  queryNodes(query: GraphQuery): GraphNode[] {
    return this.graph.query(query);
  }

  search(query: string, types?: ObjectType[]): EntitySearchResult[] {
    const results: EntitySearchResult[] = [];
    const queryLower = query.toLowerCase();

    let nodes: GraphNode[];
    if (types && types.length > 0) {
      nodes = [];
      for (const type of types) {
        nodes.push(...this.graph.getNodesByType(type));
      }
    } else {
      nodes = Array.from((this.graph as unknown as { nodes: Map<string, GraphNode> }).nodes.values());
    }

    for (const node of nodes) {
      let score = 0;
      const highlights: string[] = [];

      if (node.label.toLowerCase().includes(queryLower)) {
        score += 10;
        highlights.push("name");
      }

      if (node.object.description?.toLowerCase().includes(queryLower)) {
        score += 5;
        highlights.push("description");
      }

      for (const tag of node.object.tags ?? []) {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 3;
          highlights.push("tags");
        }
      }

      if (score > 0) {
        results.push({
          id: node.id,
          type: node.type,
          name: node.label,
          score,
          highlights,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  calculateRisk(entityId: string): RiskScore {
    return this.reasoning.calculateRiskScore(entityId);
  }

  identifyAttackPaths(targetId: string): AttackChain[] {
    return this.reasoning.identifyAttackChains(targetId);
  }

  getMitigationRecommendations(targetId: string): MitigationRecommendation[] {
    return this.reasoning.recommendMitigations(targetId);
  }

  inferCorrelations(entityId: string): Inference[] {
    return this.reasoning.inferCorrelations(entityId);
  }

  getCriticalAssets(): GraphNode[] {
    return this.reasoning.identifyCriticalAssets();
  }

  getControlCoverage(): Record<string, number> {
    return this.reasoning.calculateControlCoverage();
  }

  validateEntity(entity: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const obj = entity as Record<string, unknown>;

    if (!obj.id || typeof obj.id !== "string") {
      errors.push("Missing or invalid id");
    }

    if (!obj.type || typeof obj.type !== "string") {
      errors.push("Missing or invalid type");
    } else {
      const typeDef = objectTypeDefinitions[obj.type as ObjectType];
      if (!typeDef) {
        errors.push(`Unknown type: ${obj.type}`);
      } else {
        for (const required of typeDef.required) {
          if (!(required in obj)) {
            errors.push(`Missing required property: ${required}`);
          }
        }
      }
    }

    if (!obj.name || typeof obj.name !== "string") {
      errors.push("Missing or invalid name");
    }

    if (obj.severity) {
      const validSeverities = ["critical", "high", "medium", "low", "info"];
      if (!validSeverities.includes(obj.severity as string)) {
        warnings.push(`Invalid severity value: ${obj.severity}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  exportToSTIX(): STIXBundle {
    return this.graph.toSTIXBundle();
  }

  importFromSTIX(bundle: STIXBundle): { imported: number; failed: number } {
    let imported = 0;
    let failed = 0;

    for (const obj of bundle.objects) {
      try {
        if (obj.type === "link") {
          const link = obj as unknown as OntologyLink;
          this.graph.addLink(link);
        } else {
          this.graph.addNode(obj as OntologyObject);
        }
        imported++;
      } catch {
        failed++;
      }
    }

    return { imported, failed };
  }

  getStats(): { nodeCount: number; edgeCount: number; typeDistribution: Record<string, number> } {
    return this.graph.getStats();
  }

  clear(): void {
    this.graph.clear();
  }

  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  getConfig(): OntologyConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<OntologyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
