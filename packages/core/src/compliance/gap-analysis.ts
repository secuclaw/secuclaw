export type ComplianceFramework = 'scf-2025' | 'iso27001' | 'nist-csf' | 'soc2' | 'gdpr' | 'pci-dss';

export type ControlCategory = 
  | 'governance' | 'risk-management' | 'asset-management' | 'identity-access'
  | 'data-protection' | 'network-security' | 'endpoint-security' | 'application-security'
  | 'incident-response' | 'business-continuity' | 'compliance' | 'third-party';

export type ControlStatus = 'compliant' | 'partial' | 'non-compliant' | 'not-applicable' | 'not-assessed';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  domain: string;
  code: string;
  title: string;
  description: string;
  category: ControlCategory;
  requirements: string[];
  relatedControls: string[];
  mitreMapping?: string[];
  riskWeight: number;
  implementationGuidance?: string;
  evidenceRequired: string[];
}

export interface ControlAssessment {
  controlId: string;
  status: ControlStatus;
  score: number;
  assessedAt: Date;
  assessedBy: string;
  evidence: Evidence[];
  findings: Finding[];
  remediation?: RemediationPlan;
}

export interface Evidence {
  id: string;
  type: 'document' | 'screenshot' | 'log' | 'configuration' | 'interview' | 'observation';
  title: string;
  description: string;
  collectedAt: Date;
  source: string;
  verified: boolean;
}

export interface Finding {
  id: string;
  severity: GapSeverity;
  title: string;
  description: string;
  recommendation: string;
  affectedControls: string[];
  mitreTechniques?: string[];
}

export interface RemediationPlan {
  id: string;
  controlId: string;
  priority: GapSeverity;
  title: string;
  description: string;
  steps: RemediationStep[];
  estimatedEffort: string;
  estimatedCost?: string;
  dueDate?: Date;
  assignedTo?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'deferred';
}

export interface RemediationStep {
  order: number;
  action: string;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface GapAnalysisResult {
  id: string;
  framework: ComplianceFramework;
  assessedAt: Date;
  scope: string[];
  summary: ComplianceSummary;
  controls: ControlAssessment[];
  gaps: ComplianceGap[];
  riskScore: number;
  maturityLevel: number;
  recommendations: PrioritizedRecommendation[];
}

export interface ComplianceSummary {
  totalControls: number;
  assessed: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notApplicable: number;
  complianceScore: number;
  byCategory: Record<ControlCategory, CategorySummary>;
  byDomain: Record<string, DomainSummary>;
}

export interface CategorySummary {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  score: number;
}

export interface DomainSummary {
  domain: string;
  total: number;
  compliant: number;
  score: number;
  criticalGaps: number;
}

export interface ComplianceGap {
  id: string;
  controlId: string;
  controlTitle: string;
  severity: GapSeverity;
  category: ControlCategory;
  gap: string;
  impact: string;
  riskScore: number;
  remediation: RemediationPlan;
  mitreExposure: string[];
}

export interface PrioritizedRecommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
  affectedControls: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  riskReduction: number;
  quickWin: boolean;
}

export interface ComplianceReport {
  id: string;
  analysisId: string;
  generatedAt: Date;
  executive: ExecutiveSummary;
  details: GapAnalysisResult;
  trendComparison?: TrendComparison;
}

export interface ExecutiveSummary {
  overallScore: number;
  maturityLevel: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
  topGaps: ComplianceGap[];
  quickWins: PrioritizedRecommendation[];
  nextSteps: string[];
}

export interface TrendComparison {
  previousScore: number;
  currentScore: number;
  change: number;
  improved: string[];
  declined: string[];
  period: string;
}

export interface BenchmarkComparison {
  industry: string;
  percentile: number;
  peerAverage: number;
  yourScore: number;
}

export const SCF_DOMAINS: Record<string, string> = {
  'GOV': 'Cybersecurity & Data Privacy Governance',
  'AAT': 'AI & Autonomous Technology',
  'AST': 'Asset Management',
  'BCD': 'Business Continuity & Disaster Recovery',
  'CAP': 'Capacity & Performance Planning',
  'CHG': 'Change Management',
  'CLD': 'Cloud Security',
  'CPL': 'Compliance',
  'CFG': 'Configuration Management',
  'MON': 'Continuous Monitoring',
  'CRY': 'Cryptography',
  'DCH': 'Data Classification & Handling',
  'EMB': 'Embedded Technology',
  'END': 'Endpoint Security',
  'HRS': 'Human Resources Security',
  'IAM': 'Identity & Access Management',
  'IR': 'Incident Response',
  'IA': 'Information Assurance',
  'MA': 'Maintenance',
  'MDM': 'Mobile Device Management',
  'NET': 'Network Security',
  'PES': 'Physical & Environmental Security',
  'PRV': 'Privacy',
  'PRJ': 'Project & Resource Management',
  'RSK': 'Risk Management',
  'SEA': 'Security Engineering & Architecture',
  'OPS': 'Security Operations',
  'SAT': 'Security Awareness & Training',
  'TDA': 'Technology Development & Acquisition',
  'TPM': 'Third-Party Management',
  'THM': 'Threat Management',
  'VPM': 'Vulnerability & Patch Management',
  'WEB': 'Web Security',
};

export const CONTROL_CATEGORIES: ControlCategory[] = [
  'governance',
  'risk-management',
  'asset-management',
  'identity-access',
  'data-protection',
  'network-security',
  'endpoint-security',
  'application-security',
  'incident-response',
  'business-continuity',
  'compliance',
  'third-party',
];
