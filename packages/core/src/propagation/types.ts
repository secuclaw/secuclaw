export type RiskNodeType = 
  | 'asset'
  | 'vulnerability'
  | 'threat'
  | 'control'
  | 'process'
  | 'data'
  | 'user'
  | 'network'
  | 'application'
  | 'infrastructure';

export type RiskRelationshipType = 
  | 'depends_on'
  | 'hosts'
  | 'connects_to'
  | 'accesses'
  | 'contains'
  | 'protects'
  | 'mitigates'
  | 'exploits'
  | 'affects'
  | 'triggers';

export type PropagationAlgorithm = 'pagerank' | 'betweenness' | 'closeness' | 'eigenvector' | 'custom';

export interface RiskNode {
  id: string;
  type: RiskNodeType;
  name: string;
  description?: string;
  
  intrinsicRisk: RiskScore;
  propagatedRisk?: RiskScore;
  
  attributes: Record<string, unknown>;
  tags: string[];
  
  position?: { x: number; y: number };
  metadata: Record<string, unknown>;
}

export interface RiskScore {
  confidentiality: number;
  integrity: number;
  availability: number;
  overall: number;
  confidence: number;
}

export interface RiskEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: RiskRelationshipType;
  
  propagationFactor: number;
  bidirectional: boolean;
  
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface RiskGraph {
  nodes: RiskNode[];
  edges: RiskEdge[];
  statistics: GraphStatistics;
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  avgDegree: number;
  connectedComponents: number;
  diameter: number;
  clustering: number;
}

export interface PropagationResult {
  graphId: string;
  algorithm: PropagationAlgorithm;
  iterations: number;
  converged: boolean;
  
  nodeScores: Map<string, PropagatedScore>;
  riskHotspots: RiskHotspot[];
  
  executionTime: number;
  computedAt: Date;
}

export interface PropagatedScore {
  nodeId: string;
  previousScore: number;
  newScore: number;
  scoreChange: number;
  influence: number;
  influencedBy: string[];
}

export interface RiskHotspot {
  nodeId: string;
  nodeName: string;
  nodeType: RiskNodeType;
  score: number;
  rank: number;
  reasons: string[];
}

export interface PropagationPath {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  nodes: string[];
  edges: string[];
  
  totalRisk: number;
  propagationDelay: number;
  probability: number;
  
  criticalNodes: string[];
  criticalEdges: string[];
}

export interface PropagationConfig {
  algorithm: PropagationAlgorithm;
  maxIterations: number;
  convergenceThreshold: number;
  dampingFactor: number;
  
  nodeTypeWeights: Record<RiskNodeType, number>;
  relationshipWeights: Record<RiskRelationshipType, number>;
  
  includeControls: boolean;
  includeMitigations: boolean;
  
  customFactors?: Record<string, number>;
}

export interface ImpactAnalysis {
  sourceNodeId: string;
  impactRadius: number;
  
  directlyAffected: AffectedNode[];
  indirectlyAffected: AffectedNode[];
  
  totalImpact: number;
  riskIncrease: number;
  
  affectedAssets: string[];
  affectedProcesses: string[];
  affectedData: string[];
  
  recommendations: ImpactRecommendation[];
}

export interface AffectedNode {
  nodeId: string;
  nodeName: string;
  nodeType: RiskNodeType;
  distance: number;
  impactScore: number;
  propagationPath: string[];
}

export interface ImpactRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'containment' | 'mitigation' | 'monitoring' | 'acceptance';
  description: string;
  targetNodes: string[];
  estimatedReduction: number;
}

export interface RiskSimulation {
  id: string;
  name: string;
  description: string;
  
  baseGraphId: string;
  scenarios: SimulationScenario[];
  
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: SimulationResult[];
  
  createdAt: Date;
  createdBy: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  type: 'node_failure' | 'edge_failure' | 'risk_increase' | 'control_bypass' | 'custom';
  
  modifications: GraphModification[];
  parameters: Record<string, unknown>;
}

export interface GraphModification {
  type: 'add_node' | 'remove_node' | 'modify_node' | 'add_edge' | 'remove_edge' | 'modify_edge';
  target: string;
  changes: Record<string, unknown>;
}

export interface SimulationResult {
  scenarioId: string;
  beforeState: GraphStatistics;
  afterState: GraphStatistics;
  
  riskChange: number;
  hotspotChanges: Array<{ nodeId: string; beforeRank: number; afterRank: number }>;
  
  newRisks: string[];
  mitigatedRisks: string[];
  
  recommendations: string[];
  computedAt: Date;
}

export interface RiskPropagationDashboard {
  totalNodes: number;
  totalEdges: number;
  
  avgRiskScore: number;
  maxRiskScore: number;
  minRiskScore: number;
  
  topHotspots: RiskHotspot[];
  riskDistribution: Record<string, number>;
  
  nodesByType: Record<RiskNodeType, number>;
  riskByType: Record<RiskNodeType, { avg: number; max: number; min: number }>;
  
  recentAnalyses: ImpactAnalysis[];
  activeSimulations: RiskSimulation[];
  
  graphHealth: {
    completeness: number;
    consistency: number;
    lastUpdate: Date;
  };
}

export interface PropagationQuery {
  nodeTypes?: RiskNodeType[];
  relationships?: RiskRelationshipType[];
  minRisk?: number;
  maxRisk?: number;
  tags?: string[];
  attributes?: Record<string, unknown>;
  textSearch?: string;
  includePaths?: boolean;
  pathDepth?: number;
}

export type PropagationEventHandler = (eventType: string, data: unknown) => void | Promise<void>;
