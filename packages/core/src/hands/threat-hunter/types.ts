/**
 * ThreatHunter Hand - Types
 * 
 * Internal type definitions for threat hunting operations.
 */

// ============================================================================
// IOC Types
// ============================================================================

export type IOCType = "ip" | "domain" | "hash" | "url" | "email" | "file";

export interface IOC {
  type: IOCType;
  value: string;
  source?: string;
  firstSeen?: Date;
  lastSeen?: Date;
  confidence: number;
  tags: string[];
}

export interface IOCDetectionResult {
  ioc: IOC;
  context: string;
  severity: ThreatSeverity;
}

// ============================================================================
// Threat Types
// ============================================================================

export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export interface Threat {
  id: string;
  title: string;
  description: string;
  severity: ThreatSeverity;
  iocs: IOC[];
  techniques: string[];
  timeline: ThreatTimelineEntry[];
 MitredBy?: string;
  status: "new" | "investigating" | "contained" | "resolved";
}

export interface ThreatTimelineEntry {
  timestamp: Date;
  event: string;
  source: string;
}

// ============================================================================
// MITRE Types
// ============================================================================

export interface MitreTechnique {
  id: string; // e.g., "T1059"
  name: string;
  tactic: string;
  description: string;
  detection: string;
  mitigation: string[];
}

export interface MitreTactic {
  id: string; // e.g., "TA0001"
  name: string;
  techniques: MitreTechnique[];
}

// ============================================================================
// Correlation Types
// ============================================================================

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  source: string;
  eventType: string;
  severity: ThreatSeverity;
  rawData: Record<string, unknown>;
  iocs: IOC[];
}

export interface CorrelatedGroup {
  id: string;
  events: SecurityEvent[];
  startTime: Date;
  endTime: Date;
  techniques: MitreTechnique[];
  riskScore: number;
  description: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface ThreatReport {
  id: string;
  generatedAt: Date;
  summary: ThreatSummary;
  threats: Threat[];
  iocs: IOC[];
  MitredTechniques: MitreTechnique[];
  recommendations: string[];
}

export interface ThreatSummary {
  totalThreats: number;
  bySeverity: Record<ThreatSeverity, number>;
  totalIOCs: number;
  MitredTechniquesCount: number;
  overallRiskScore: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// Hunt Result
// ============================================================================

export interface ThreatHuntResult {
  success: boolean;
  threats: Threat[];
  iocs: IOC[];
  correlatedGroups: CorrelatedGroup[];
  MitredTechniques: MitreTechnique[];
  summary: ThreatSummary;
  duration: number;
}
