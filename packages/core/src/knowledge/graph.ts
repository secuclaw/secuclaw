import type { SCFThreat } from '../knowledge/scf/threats.js';

export interface GraphNode {
  id: string;
  type: 'attack' | 'asset' | 'threat' | 'vulnerability' | 'control' | 'risk' | 'incident';
  label: string;
  properties: Record<string, unknown>;
  position?: { x: number; y: number };
  style?: NodeStyle;
}

export interface NodeStyle {
  color?: string;
  icon?: string;
  size?: number;
  shape?: 'circle' | 'rect' | 'diamond' | 'hexagon';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  weight?: number;
  properties?: Record<string, unknown>;
  style?: EdgeStyle;
}

export type EdgeType = 
  | 'exploits'
  | 'mitigates'
  | 'indicates'
  | 'affects'
  | 'depends_on'
  | 'causes'
  | 'prevents'
  | 'detects'
  | 'responds_to'
  | 'contains'
  | 'belongs_to'
  | 'communicates_with';

export interface EdgeStyle {
  color?: string;
  width?: number;
  dashed?: boolean;
  animated?: boolean;
}

export interface KnowledgeGraph {
  id: string;
  name: string;
  type: 'attack_chain' | 'asset_relation' | 'risk_propagation' | 'threat_landscape';
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
  };
}

export interface AttackChainStep {
  id: string;
  technique: string;
  tactic: string;
  description: string;
  order: number;
  evidence?: string[];
  status: 'suspected' | 'confirmed' | 'blocked';
}

export interface AssetNode extends GraphNode {
  type: 'asset';
  properties: {
    assetType: 'server' | 'network' | 'application' | 'data' | 'user' | 'device';
    criticality: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    location?: string;
    ipAddress?: string;
    hostname?: string;
    os?: string;
  };
}

export interface RiskPropagationPath {
  sourceRisk: string;
  targetAsset: string;
  propagationType: 'direct' | 'cascading' | 'correlated';
  probability: number;
  impactMultiplier: number;
}

export class KnowledgeGraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  addNode(node: GraphNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  addEdge(edge: GraphEdge): this {
    this.edges.set(edge.id, edge);
    return this;
  }

  removeNode(nodeId: string): this {
    this.nodes.delete(nodeId);
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edgeId);
      }
    }
    return this;
  }

  build(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  clear(): this {
    this.nodes.clear();
    this.edges.clear();
    return this;
  }
}

export class AttackChainGraph {
  private steps: AttackChainStep[] = [];
  private relationships: { from: string; to: string; type: string }[] = [];

  addStep(step: AttackChainStep): this {
    this.steps.push(step);
    return this;
  }

  addRelationship(fromStepId: string, toStepId: string, type: string): this {
    this.relationships.push({ from: fromStepId, to: toStepId, type });
    return this;
  }

  toGraph(): KnowledgeGraph {
    const builder = new KnowledgeGraphBuilder();

    for (const step of this.steps) {
      builder.addNode({
        id: step.id,
        type: 'attack',
        label: step.technique,
        properties: {
          tactic: step.tactic,
          description: step.description,
          order: step.order,
          evidence: step.evidence,
          status: step.status,
        },
        style: {
          color: step.status === 'confirmed' ? '#ef4444' :
                 step.status === 'blocked' ? '#22c55e' : '#f59e0b',
          shape: 'diamond',
        },
      });
    }

    for (const rel of this.relationships) {
      builder.addEdge({
        id: `edge-${rel.from}-${rel.to}`,
        source: rel.from,
        target: rel.to,
        type: rel.type as EdgeType,
        style: {
          animated: true,
          color: '#f97316',
        },
      });
    }

    const { nodes, edges } = builder.build();

    return {
      id: `attack-chain-${Date.now()}`,
      name: 'Attack Chain Analysis',
      type: 'attack_chain',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    };
  }

  static fromMITRETechniques(techniques: { id: string; name: string; tactic: string }[]): KnowledgeGraph {
    const graph = new AttackChainGraph();
    
    const tacticOrder = [
      'Reconnaissance', 'Resource Development', 'Initial Access', 'Execution',
      'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access',
      'Discovery', 'Lateral Movement', 'Collection', 'Command and Control',
      'Exfiltration', 'Impact'
    ];

    const sortedTechniques = techniques.sort((a, b) => 
      tacticOrder.indexOf(a.tactic) - tacticOrder.indexOf(b.tactic)
    );

    sortedTechniques.forEach((tech, index) => {
      graph.addStep({
        id: tech.id,
        technique: tech.name,
        tactic: tech.tactic,
        description: `${tech.tactic} technique: ${tech.name}`,
        order: index,
        status: 'suspected',
      });
    });

    for (let i = 0; i < sortedTechniques.length - 1; i++) {
      graph.addRelationship(sortedTechniques[i].id, sortedTechniques[i + 1].id, 'leads_to');
    }

    return graph.toGraph();
  }
}

export class AssetRelationGraph {
  private assets: AssetNode[] = [];
  private connections: { source: string; target: string; type: string; label?: string }[] = [];

  addAsset(asset: AssetNode): this {
    this.assets.push(asset);
    return this;
  }

  addConnection(sourceId: string, targetId: string, type: string, label?: string): this {
    this.connections.push({ source: sourceId, target: targetId, type, label });
    return this;
  }

  toGraph(): KnowledgeGraph {
    const builder = new KnowledgeGraphBuilder();

    for (const asset of this.assets) {
      builder.addNode(asset);
    }

    for (const conn of this.connections) {
      builder.addEdge({
        id: `edge-${conn.source}-${conn.target}`,
        source: conn.source,
        target: conn.target,
        type: conn.type as EdgeType,
        label: conn.label,
        style: {
          color: conn.type === 'communicates_with' ? '#3b82f6' : '#6b7280',
        },
      });
    }

    const { nodes, edges } = builder.build();

    return {
      id: `asset-relation-${Date.now()}`,
      name: 'Asset Relationship Map',
      type: 'asset_relation',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    };
  }

  static createEnterpriseGraph(): KnowledgeGraph {
    const graph = new AssetRelationGraph();

    graph.addAsset({
      id: 'fw-01',
      type: 'asset',
      label: 'Firewall',
      properties: {
        assetType: 'network',
        criticality: 'critical',
        hostname: 'fw-primary',
        ipAddress: '10.0.0.1',
      },
      style: { color: '#8b5cf6', icon: '🛡️' },
    });

    graph.addAsset({
      id: 'dc-01',
      type: 'asset',
      label: 'Domain Controller',
      properties: {
        assetType: 'server',
        criticality: 'critical',
        hostname: 'dc01',
        ipAddress: '10.0.1.10',
        os: 'Windows Server 2022',
      },
      style: { color: '#ef4444', icon: '🖥️' },
    });

    graph.addAsset({
      id: 'db-01',
      type: 'asset',
      label: 'Database Server',
      properties: {
        assetType: 'server',
        criticality: 'high',
        hostname: 'db01',
        ipAddress: '10.0.2.20',
        os: 'Linux',
      },
      style: { color: '#f59e0b', icon: '🗄️' },
    });

    graph.addAsset({
      id: 'web-01',
      type: 'asset',
      label: 'Web Server',
      properties: {
        assetType: 'server',
        criticality: 'high',
        hostname: 'web01',
        ipAddress: '10.0.2.10',
        os: 'Linux',
      },
      style: { color: '#22c55e', icon: '🌐' },
    });

    graph.addAsset({
      id: 'app-01',
      type: 'asset',
      label: 'Application Server',
      properties: {
        assetType: 'server',
        criticality: 'high',
        hostname: 'app01',
        ipAddress: '10.0.2.15',
        os: 'Linux',
      },
      style: { color: '#3b82f6', icon: '⚙️' },
    });

    graph.addConnection('fw-01', 'web-01', 'communicates_with', 'HTTPS');
    graph.addConnection('web-01', 'app-01', 'communicates_with', 'API');
    graph.addConnection('app-01', 'db-01', 'communicates_with', 'SQL');
    graph.addConnection('app-01', 'dc-01', 'depends_on', 'LDAP Auth');
    graph.addConnection('web-01', 'dc-01', 'depends_on', 'AD Auth');

    return graph.toGraph();
  }
}

export class RiskPropagationGraph {
  private risks: GraphNode[] = [];
  private assets: GraphNode[] = [];
  private propagationPaths: RiskPropagationPath[] = [];

  addRisk(risk: GraphNode): this {
    this.risks.push(risk);
    return this;
  }

  addAsset(asset: GraphNode): this {
    this.assets.push(asset);
    return this;
  }

  addPropagationPath(path: RiskPropagationPath): this {
    this.propagationPaths.push(path);
    return this;
  }

  toGraph(): KnowledgeGraph {
    const builder = new KnowledgeGraphBuilder();

    for (const risk of this.risks) {
      builder.addNode({
        ...risk,
        style: {
          color: '#ef4444',
          shape: 'hexagon',
        },
      });
    }

    for (const asset of this.assets) {
      builder.addNode(asset);
    }

    for (const path of this.propagationPaths) {
      builder.addEdge({
        id: `prop-${path.sourceRisk}-${path.targetAsset}`,
        source: path.sourceRisk,
        target: path.targetAsset,
        type: 'affects',
        label: `${(path.probability * 100).toFixed(0)}% / ${path.impactMultiplier}x`,
        weight: path.probability * path.impactMultiplier,
        style: {
          color: path.probability > 0.7 ? '#ef4444' : path.probability > 0.4 ? '#f59e0b' : '#22c55e',
          width: path.probability * 3,
          dashed: path.propagationType === 'correlated',
        },
      });
    }

    const { nodes, edges } = builder.build();

    return {
      id: `risk-prop-${Date.now()}`,
      name: 'Risk Propagation Analysis',
      type: 'risk_propagation',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    };
  }

  static fromThreatsAndAssets(threats: SCFThreat[], assets: string[]): KnowledgeGraph {
    const graph = new RiskPropagationGraph();

    for (const threat of threats) {
      graph.addRisk({
        id: threat.id,
        type: 'threat',
        label: threat.name,
        properties: {
          category: threat.category,
          severity: threat.severity,
          likelihood: threat.likelihood,
          impact: threat.impact,
        },
      });
    }

    for (const asset of assets) {
      graph.addAsset({
        id: `asset-${asset.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'asset',
        label: asset,
        properties: { name: asset },
      });
    }

    for (const threat of threats) {
      for (const domain of threat.affectedDomains) {
        graph.addPropagationPath({
          sourceRisk: threat.id,
          targetAsset: `asset-${domain.toLowerCase().replace(/\s+/g, '-')}`,
          propagationType: 'direct',
          probability: threat.likelihood === 'very_high' ? 0.9 :
                       threat.likelihood === 'high' ? 0.7 :
                       threat.likelihood === 'medium' ? 0.5 : 0.3,
          impactMultiplier: threat.impact === 'severe' ? 3 :
                            threat.impact === 'major' ? 2 :
                            threat.impact === 'moderate' ? 1.5 : 1,
        });
      }
    }

    return graph.toGraph();
  }
}

export class ThreatLandscapeGraph {
  static createFromSCFThreats(threats: SCFThreat[]): KnowledgeGraph {
    const builder = new KnowledgeGraphBuilder();

    for (const threat of threats) {
      builder.addNode({
        id: threat.id,
        type: 'threat',
        label: threat.name,
        properties: {
          category: threat.category,
          severity: threat.severity,
          likelihood: threat.likelihood,
          impact: threat.impact,
          description: threat.description,
          mitreTactics: threat.mitreMapping?.tactics || [],
          mitreTechniques: threat.mitreMapping?.techniques || [],
        },
        style: {
          color: threat.severity === 'critical' ? '#dc2626' :
                 threat.severity === 'high' ? '#ea580c' :
                 threat.severity === 'medium' ? '#ca8a04' : '#16a34a',
          size: threat.category === 'MT' ? 40 : 30,
        },
      });

      for (const tactic of threat.mitreMapping?.tactics || []) {
        const tacticNodeId = `tactic-${tactic.toLowerCase().replace(/\s+/g, '-')}`;
        
        builder.addNode({
          id: tacticNodeId,
          type: 'attack',
          label: tactic,
          properties: { type: 'mitre_tactic' },
          style: { color: '#6366f1', shape: 'rect' },
        });

        builder.addEdge({
          id: `edge-${threat.id}-${tacticNodeId}`,
          source: threat.id,
          target: tacticNodeId,
          type: 'indicates',
          style: { dashed: true },
        });
      }
    }

    const { nodes, edges } = builder.build();

    return {
      id: `threat-landscape-${Date.now()}`,
      name: 'SCF Threat Landscape',
      type: 'threat_landscape',
      nodes,
      edges,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
      },
    };
  }
}

export function calculateGraphStats(graph: KnowledgeGraph): {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
  avgConnections: number;
  mostConnectedNode: { id: string; connections: number } | null;
} {
  const nodeTypes: Record<string, number> = {};
  const edgeTypes: Record<string, number> = {};
  const connections: Record<string, number> = {};

  for (const node of graph.nodes) {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    connections[node.id] = 0;
  }

  for (const edge of graph.edges) {
    edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    connections[edge.source] = (connections[edge.source] || 0) + 1;
    connections[edge.target] = (connections[edge.target] || 0) + 1;
  }

  const totalConnections = Object.values(connections).reduce((a, b) => a + b, 0);
  const avgConnections = graph.nodes.length > 0 ? totalConnections / graph.nodes.length : 0;

  let mostConnectedNode: { id: string; connections: number } | null = null;
  for (const [id, count] of Object.entries(connections)) {
    if (!mostConnectedNode || count > mostConnectedNode.connections) {
      mostConnectedNode = { id, connections: count };
    }
  }

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    nodeTypes,
    edgeTypes,
    avgConnections,
    mostConnectedNode,
  };
}
