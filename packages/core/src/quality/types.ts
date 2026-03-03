export type QualityDimension =
  | "accuracy"
  | "relevance"
  | "coherence"
  | "safety"
  | "completeness"
  | "conciseness";

export type QualityLevel = "excellent" | "good" | "acceptable" | "poor" | "unacceptable";

export type ContentType =
  | "security_analysis"
  | "threat_report"
  | "vulnerability_assessment"
  | "incident_response"
  | "compliance_audit"
  | "code_review"
  | "recommendation"
  | "general";

export interface QualityScore {
  dimension: QualityDimension;
  score: number;
  weight: number;
  reasoning: string;
}

export interface QualityAssessment {
  id: string;
  timestamp: number;
  content: string;
  contentType: ContentType;
  overallScore: number;
  level: QualityLevel;
  dimensionScores: QualityScore[];
  issues: QualityIssue[];
  recommendations: string[];
  passed: boolean;
  metadata: Record<string, unknown>;
}

export interface QualityIssue {
  type: "error" | "warning" | "info";
  dimension: QualityDimension;
  description: string;
  location?: {
    start: number;
    end: number;
  };
  severity: number;
  suggestion?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  dimension: QualityDimension;
  weight: number;
  validator: (content: string, context?: ValidationContext) => ValidationResult;
  applicableTypes: ContentType[];
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  reasoning: string;
}

export interface ValidationContext {
  contentType: ContentType;
  expectedFormat?: string;
  referenceContent?: string;
  domain?: string;
  language?: string;
  maxLength?: number;
  minLength?: number;
}

export interface HallucinationIndicator {
  type: "factual" | "logical" | "temporal" | "citation" | "metric";
  confidence: number;
  description: string;
  evidence: string;
}

export interface QualityConfig {
  minimumScore: number;
  enableHallucinationDetection: boolean;
  enableFactChecking: boolean;
  enableSafetyCheck: boolean;
  customRules: ValidationRule[];
  dimensionWeights: Record<QualityDimension, number>;
}

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  minimumScore: 0.6,
  enableHallucinationDetection: true,
  enableFactChecking: true,
  enableSafetyCheck: true,
  customRules: [],
  dimensionWeights: {
    accuracy: 0.25,
    relevance: 0.2,
    coherence: 0.15,
    safety: 0.2,
    completeness: 0.1,
    conciseness: 0.1,
  },
};

export const QUALITY_LEVEL_THRESHOLDS: Record<QualityLevel, [number, number]> = {
  excellent: [0.9, 1.0],
  good: [0.75, 0.9],
  acceptable: [0.6, 0.75],
  poor: [0.4, 0.6],
  unacceptable: [0, 0.4],
};

export const SECURITY_KEYWORDS = {
  threat: [
    "malware", "ransomware", "phishing", "exploit", "vulnerability",
    "attack", "breach", "intrusion", "backdoor", "trojan",
  ],
  mitre: [
    "T", "TA", "initial access", "execution", "persistence",
    "privilege escalation", "defense evasion", "credential access",
    "discovery", "lateral movement", "collection", "exfiltration",
  ],
  sensitive: [
    "password", "secret", "api key", "token", "credential",
    "private key", "certificate",
  ],
};

export const HALLUCINATION_PATTERNS = [
  {
    pattern: /\b(\d{1,3}\.){3}\d{1,3}\b/g,
    type: "factual" as const,
    description: "IP address - verify existence",
  },
  {
    pattern: /[a-f0-9]{32,64}/gi,
    type: "factual" as const,
    description: "Hash value - verify authenticity",
  },
  {
    pattern: /CVE-\d{4}-\d{4,}/gi,
    type: "factual" as const,
    description: "CVE ID - verify existence",
  },
  {
    pattern: /\b\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\b/g,
    type: "temporal" as const,
    description: "Specific date - verify timeline",
  },
  {
    pattern: /根据.*研究|研究表明|据统计/g,
    type: "citation" as const,
    description: "Research citation - verify source",
  },
  {
    pattern: /\d+(\.\d+)?\s*%/g,
    type: "metric" as const,
    description: "Percentage metric - verify accuracy",
  },
];
