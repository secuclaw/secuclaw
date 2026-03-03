/**
 * Attack Trace Types - 全链路攻击溯源系统
 * 
 * 用于追踪攻击者的完整攻击链路，从初始入侵到最终目标
 */

export type TraceNodeSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type TraceNodeStatus = 'confirmed' | 'suspected' | 'false_positive' | 'unknown';
export type TraceNodeType = 
  | 'entry_point'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'data_access'
  | 'exfiltration'
  | 'persistence'
  | 'command_control'
  | 'execution';

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  name: string;
  description: string;
  timestamp: Date;
  severity: TraceNodeSeverity;
  status: TraceNodeStatus;
  confidence: number;
  
  // 资产信息
  asset: TraceAsset;
  
  // 攻击指标
  indicators: TraceIndicator[];
  
  // MITRE ATT&CK 映射
  mitreTactics: string[];
  mitreTechniques: string[];
  
  // 证据
  evidence: TraceEvidence[];
  
  // 来源
  source: TraceSource;
  
  // 元数据
  metadata: Record<string, unknown>;
}

export interface TraceAsset {
  type: 'host' | 'user' | 'network' | 'application' | 'data' | 'container' | 'cloud_resource';
  identifier: string;
  name?: string;
  ip?: string;
  hostname?: string;
  domain?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  environment?: string;
  owner?: string;
  location?: string;
}

export interface TraceIndicator {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'port' | 'process' | 'file' | 'registry' | 'user_agent';
  value: string;
  confidence: number;
  firstSeen?: Date;
  lastSeen?: Date;
  context?: string;
  threatIntel?: ThreatIntelInfo;
}

export interface ThreatIntelInfo {
  source: string;
  reputation: 'malicious' | 'suspicious' | 'unknown' | 'benign';
  tags: string[];
  description?: string;
}

export interface TraceEvidence {
  id: string;
  type: 'log' | 'pcap' | 'screenshot' | 'file' | 'memory' | 'registry' | 'network_flow';
  description: string;
  path?: string;
  hash?: string;
  collectedAt: Date;
  collectedBy: string;
  preserved: boolean;
}

export interface TraceSource {
  type: 'siem' | 'eds' | 'fw' | 'proxy' | 'mail_gateway' | 'manual' | 'threat_intel' | 'honey_pot';
  name: string;
  rawEvent?: Record<string, unknown>;
  eventId?: string;
}

export interface TraceEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: TraceRelationship;
  timestamp: Date;
  confidence: number;
  evidence: TraceEvidence[];
  metadata: Record<string, unknown>;
}

export type TraceRelationship = 
  | 'connected_to'
  | 'authenticated_as'
  | 'executed_on'
  | 'accessed'
  | 'moved_to'
  | 'escalated_to'
  | 'exfiltrated_to'
  | 'downloaded_from'
  | 'commanded_by'
  | 'created'
  | 'modified';

export interface AttackChain {
  id: string;
  name: string;
  description: string;
  status: TraceStatus;
  
  // 攻击链节点和边
  nodes: TraceNode[];
  edges: TraceEdge[];
  
  // 攻击者信息
  attacker: AttackerProfile;
  
  // 时间范围
  firstActivityAt: Date;
  lastActivityAt: Date;
  
  // 影响评估
  impact: ImpactAssessment;
  
  // 时间线
  timeline: TraceTimelineEvent[];
  
  // 分析信息
  analyzedBy?: string;
  analyzedAt?: Date;
  notes: TraceNote[];
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export type TraceStatus = 'active' | 'contained' | 'resolved' | 'false_positive' | 'investigating';

export interface AttackerProfile {
  identifier?: string;
  type: 'external' | 'internal' | 'apt' | 'script_kiddie' | 'insider' | 'unknown';
  motivation?: 'financial' | 'espionage' | 'sabotage' | 'hacktivism' | 'unknown';
  sophistication: 'novice' | 'intermediate' | 'advanced' | 'expert' | 'unknown';
  aliases: string[];
  associatedGroups: string[];
  ttps: string[];
}

export interface ImpactAssessment {
  overallSeverity: 'critical' | 'high' | 'medium' | 'low';
  affectedAssetsCount: number;
  dataCompromised: boolean;
  dataTypesCompromised: string[];
  businessImpact: 'severe' | 'significant' | 'moderate' | 'minor' | 'negligible';
  estimatedCost?: number;
  regulatoryImpact: string[];
}

export interface TraceTimelineEvent {
  id: string;
  timestamp: Date;
  nodeId: string;
  type: 'detection' | 'analysis' | 'containment' | 'eradication' | 'recovery' | 'note';
  description: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export interface TraceNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  type: 'observation' | 'hypothesis' | 'action' | 'conclusion';
}

export interface AttackTraceQuery {
  timeRange?: { start: Date; end: Date };
  nodeTypes?: TraceNodeType[];
  severities?: TraceNodeSeverity[];
  statuses?: TraceNodeStatus[];
  assetIdentifiers?: string[];
  mitreTactics?: string[];
  mitreTechniques?: string[];
  indicators?: string[];
  textSearch?: string;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
  statistics: TraceStatistics;
}

export interface TraceStatistics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<TraceNodeType, number>;
  nodesBySeverity: Record<TraceNodeSeverity, number>;
  timeline: { timestamp: Date; count: number }[];
  mitreCoverage: {
    tactics: Record<string, number>;
    techniques: Record<string, number>;
  };
  avgConfidence: number;
  attackDuration: number;
}

export interface TraceDashboard {
  activeTraces: number;
  tracesByStatus: Record<TraceStatus, number>;
  tracesBySeverity: Record<string, number>;
  recentTraces: AttackChain[];
  topIndicators: Array<{ indicator: string; type: string; count: number }>;
  mitreHeatmap: Record<string, number>;
  avgTimeToContain: number;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: CorrelationCondition[];
  timeWindow: number;
  minMatches: number;
  severity: TraceNodeSeverity;
}

export interface CorrelationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'exists' | 'in';
  value: string | number | string[];
}

export interface TraceEnrichment {
  nodeId: string;
  enrichments: EnrichmentData[];
}

export interface EnrichmentData {
  source: string;
  type: 'threat_intel' | 'asset_info' | 'user_info' | 'vulnerability' | 'geolocation';
  data: Record<string, unknown>;
  enrichedAt: Date;
  confidence: number;
}
