/**
 * ComplianceAuditor Hand - Types
 */

export type Framework = "iso27001" | "gdpr" | "soc2" | "nist";

export interface ComplianceCheck {
  id: string;
  controlId: string;
  title: string;
  description: string;
  status: "pass" | "fail" | "partial" | "not-applicable";
  severity: "critical" | "high" | "medium" | "low";
  evidence?: string[];
  recommendation?: string;
}

export interface FrameworkResult {
  framework: Framework;
  score: number;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  checks: ComplianceCheck[];
}

export interface GapAnalysis {
  framework: Framework;
  gaps: ComplianceGap[];
}

export interface ComplianceGap {
  controlId: string;
  title: string;
  currentState: string;
  requiredState: string;
  remediationEffort: "low" | "medium" | "high";
}
