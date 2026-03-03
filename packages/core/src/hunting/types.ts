export type HuntingHypothesisStatus = 'proposed' | 'investigating' | 'confirmed' | 'dismissed' | 'false_positive';

export type HuntingTechnique = 
  | 'behavioral_analysis'
  | 'ioc_correlation'
  | 'log_correlation'
  | 'network_analysis'
  | 'endpoint_forensics'
  | 'memory_analysis'
  | 'threat_intel_matching'
  | 'anomaly_detection'
  | 'signature_based'
  | 'ml_based';

export type HuntingPriority = 'critical' | 'high' | 'medium' | 'low';

export interface HuntingHypothesis {
  id: string;
  title: string;
  description: string;
  mitreTactics: string[];
  mitreTechniques: string[];
  technique: HuntingTechnique;
  status: HuntingHypothesisStatus;
  priority: HuntingPriority;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  confidence: number;
  iocs: IOCInput[];
  data_sources: string[];
  queries: HuntingQuery[];
  findings: HuntingFinding[];
  evidence: HuntingEvidence[];
  timeline: HuntingTimelineEvent[];
  assigned_to?: string;
  tags: string[];
}

export interface HuntingQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  queryLanguage: 'spl' | 'kql' | 'sigma' | 'lucene' | 'sql' | 'custom';
  dataSource: string;
  timeRange: { start: Date; end: Date };
  results?: HuntingQueryResult;
}

export interface HuntingQueryResult {
  total_hits: number;
  unique_events: number;
  events: Record<string, unknown>[];
  aggregations?: Record<string, unknown>;
  executed_at: Date;
  duration_ms: number;
}

export interface HuntingFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  mitre_tactic?: string;
  mitre_technique?: string;
  related_iocs: IOCInput[];
  related_events: string[];
  created_at: Date;
  validated: boolean;
  false_positive: boolean;
}

export interface HuntingEvidence {
  id: string;
  type: 'log' | 'pcap' | 'screenshot' | 'file' | 'memory_dump' | 'network_flow' | 'process_tree';
  source: string;
  description: string;
  content?: string;
  file_path?: string;
  hash?: string;
  collected_at: Date;
  collected_by: string;
}

export interface HuntingTimelineEvent {
  id: string;
  timestamp: Date;
  event_type: string;
  description: string;
  source: string;
  raw_data?: Record<string, unknown>;
  mitre_tactic?: string;
  mitre_technique?: string;
  confidence: number;
}

export interface HuntingSession {
  id: string;
  name: string;
  description: string;
  hypotheses: HuntingHypothesis[];
  status: 'active' | 'paused' | 'completed' | 'archived';
  started_at: Date;
  ended_at?: Date;
  lead_hunter: string;
  team_members: string[];
  scope: {
    time_range: { start: Date; end: Date };
    assets?: string[];
    networks?: string[];
    users?: string[];
    data_sources: string[];
  };
  statistics: HuntingStatistics;
}

export interface HuntingStatistics {
  total_hypotheses: number;
  confirmed_threats: number;
  false_positives: number;
  pending_investigation: number;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  iocs_discovered: number;
  coverage_score: number;
}

export interface HuntingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  technique: HuntingTechnique;
  mitre_mapping: {
    tactics: string[];
    techniques: string[];
  };
  conditions: HuntingCondition[];
  actions: HuntingAction[];
  false_positive_rate?: number;
  last_triggered?: Date;
  trigger_count: number;
}

export interface HuntingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: string | number | string[];
  data_source: string;
}

export interface HuntingAction {
  type: 'create_hypothesis' | 'alert' | 'collect_evidence' | 'run_query' | 'notify';
  parameters: Record<string, unknown>;
}

export interface IOCInput {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'cve' | 'file' | 'certificate';
  value: string;
  hashType?: 'md5' | 'sha1' | 'sha256' | 'sha512';
}

export interface HuntingPlaybook {
  id: string;
  name: string;
  description: string;
  mitre_tactics: string[];
  steps: HuntingPlaybookStep[];
  estimated_duration_minutes: number;
  required_data_sources: string[];
  author: string;
  created_at: Date;
  updated_at: Date;
  version: string;
}

export interface HuntingPlaybookStep {
  order: number;
  name: string;
  description: string;
  technique: HuntingTechnique;
  queries?: HuntingQuery[];
  expected_outcomes: string[];
  next_steps_on_success?: number[];
  next_steps_on_failure?: number[];
}

export interface HuntingDashboard {
  active_sessions: number;
  total_hypotheses_today: number;
  confirmed_threats_today: number;
  top_mitre_techniques: Array<{ technique: string; count: number }>;
  top_hunters: Array<{ hunter: string; confirmed_count: number }>;
  recent_findings: HuntingFinding[];
  hypothesis_by_status: Record<HuntingHypothesisStatus, number>;
  hypothesis_by_priority: Record<HuntingPriority, number>;
}
