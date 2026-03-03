export type TeamType = 'red' | 'blue' | 'purple';

export type AttackPhase = 
  | 'reconnaissance'
  | 'resource-development'
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-and-control'
  | 'exfiltration'
  | 'impact';

export type AttackSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface AttackTechnique {
  id: string;
  mitreId: string;
  name: string;
  phase: AttackPhase;
  description: string;
  severity: AttackSeverity;
  tactics: string[];
  platforms: string[];
  detectionDifficulty: number;
  executionComplexity: number;
}

export interface AttackStep {
  id: string;
  technique: AttackTechnique;
  status: SimulationStatus;
  startTime?: Date;
  endTime?: Date;
  target: string;
  parameters: Record<string, unknown>;
  result?: {
    success: boolean;
    output?: string;
    indicators?: string[];
    artifacts?: string[];
    error?: string;
  };
  detectionResult?: DetectionResult;
}

export interface DetectionResult {
  detected: boolean;
  detectionTime?: number;
  detectionMethod?: string;
  alertId?: string;
  falsePositive: boolean;
  responseTime?: number;
}

export interface AttackChain {
  id: string;
  name: string;
  description: string;
  target: string;
  steps: AttackStep[];
  status: SimulationStatus;
  startTime?: Date;
  endTime?: Date;
  metadata: {
    createdBy: string;
    createdAt: Date;
    tags: string[];
    objectives: string[];
    scope: string[];
  };
}

export interface SimulationConfig {
  maxDuration: number;
  autoStop: boolean;
  stopOnDetection: boolean;
  collectArtifacts: boolean;
  networkCapture: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  targets: SimulationTarget[];
  excludedTechniques: string[];
  requiredApprovals: string[];
}

export interface SimulationTarget {
  id: string;
  type: 'host' | 'network' | 'application' | 'cloud' | 'container';
  identifier: string;
  scope: string[];
  authorized: boolean;
}

export interface SimulationResult {
  id: string;
  chain: AttackChain;
  summary: {
    totalSteps: number;
    successfulSteps: number;
    detectedSteps: number;
    blockedSteps: number;
    duration: number;
    meanTimeToDetection?: number;
    meanTimeToResponse?: number;
  };
  timeline: TimelineEvent[];
  detectionCoverage: {
    technique: string;
    detected: boolean;
    detectionTime?: number;
  }[];
  recommendations: SecurityRecommendation[];
  report: AfterActionReport;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'attack' | 'detection' | 'response' | 'block';
  stepId: string;
  description: string;
  severity: AttackSeverity;
}

export interface SecurityRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'detection' | 'prevention' | 'response' | 'architecture';
  title: string;
  description: string;
  affectedTechniques: string[];
  remediation: string;
  references: string[];
}

export interface AfterActionReport {
  id: string;
  simulationId: string;
  generatedAt: Date;
  executive: {
    summary: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    keyFindings: string[];
  };
  attackSummary: {
    objectives: string[];
    achieved: string[];
    failed: string[];
  };
  defenseSummary: {
    detections: number;
    blocked: number;
    missed: number;
    falsePositives: number;
    avgDetectionTime: number;
  };
  findings: Finding[];
  recommendations: SecurityRecommendation[];
  metrics: SimulationMetrics;
}

export interface Finding {
  id: string;
  type: 'gap' | 'strength' | 'opportunity' | 'risk';
  severity: AttackSeverity;
  title: string;
  description: string;
  evidence: string[];
  impact: string;
  recommendation: string;
}

export interface SimulationMetrics {
  attackSuccessRate: number;
  detectionRate: number;
  meanTimeToDetection: number;
  meanTimeToResponse: number;
  coverageByPhase: Record<AttackPhase, number>;
  topMissedTechniques: string[];
  topDetectedTechniques: string[];
}

export interface DefenseVerification {
  id: string;
  controlId: string;
  technique: string;
  testResult: 'pass' | 'fail' | 'partial' | 'unknown';
  evidence: string;
  timestamp: Date;
  assessor: string;
}

export interface RedBlueTeamSession {
  id: string;
  type: TeamType;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  participants: {
    red: string[];
    blue: string[];
    white: string[];
  };
  scope: {
    targets: SimulationTarget[];
    rulesOfEngagement: string[];
    blackoutPeriods: { start: Date; end: Date }[];
  };
  simulations: SimulationResult[];
  report?: AfterActionReport;
}
