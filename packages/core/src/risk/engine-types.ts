export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskCategory = 
  | 'threat'
  | 'vulnerability'
  | 'compliance'
  | 'operational'
  | 'external'
  | 'human';

export interface RiskFactor {
  id: string;
  category: RiskCategory;
  name: string;
  description: string;
  weight: number;
  maxValue: number;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
  source: string;
}

export interface RiskScore {
  id: string;
  timestamp: Date;
  overall: number;
  level: RiskLevel;
  factors: RiskFactor[];
  breakdown: Record<RiskCategory, number>;
  confidence: number;
  expiresAt: Date;
}

export interface RiskEvent {
  id: string;
  type: 'threat' | 'vulnerability' | 'incident' | 'compliance' | 'external';
  severity: RiskLevel;
  category: RiskCategory;
  title: string;
  description: string;
  impact: number;
  probability: number;
  timestamp: Date;
  source: string;
  mitreTechnique?: string;
  affectedAssets: string[];
  mitigated: boolean;
  mitigationFactor?: number;
}

export interface RiskThreshold {
  category: RiskCategory;
  lowMax: number;
  mediumMax: number;
  highMax: number;
  alertThreshold: number;
  criticalThreshold: number;
}

export interface RiskTrend {
  period: 'hour' | 'day' | 'week' | 'month';
  data: {
    timestamp: Date;
    score: number;
    level: RiskLevel;
  }[];
  direction: 'improving' | 'declining' | 'stable';
  changeRate: number;
}

export interface RiskAssessment {
  id: string;
  assetId: string;
  assetName: string;
  assetType: 'server' | 'workstation' | 'application' | 'network' | 'cloud' | 'data';
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  exposure: {
    mitreTechniques: string[];
    vulnerabilities: number;
    threats: number;
  };
  businessImpact: {
    confidentiality: number;
    integrity: number;
    availability: number;
  };
  recommendations: RiskRecommendation[];
  lastAssessed: Date;
}

export interface RiskRecommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
  riskReduction: number;
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  deadline?: Date;
}

export const RISK_LEVELS: Record<RiskLevel, { min: number; max: number; label: string; color: string }> = {
  low: { min: 0, max: 25, label: 'Low', color: 'green' },
  medium: { min: 25, max: 50, label: 'Medium', color: 'yellow' },
  high: { min: 50, max: 75, label: 'High', color: 'orange' },
  critical: { min: 75, max: 100, label: 'Critical', color: 'red' },
};

export const DEFAULT_THRESHOLDS: RiskThreshold[] = [
  { category: 'threat', lowMax: 20, mediumMax: 40, highMax: 60, alertThreshold: 50, criticalThreshold: 80 },
  { category: 'vulnerability', lowMax: 25, mediumMax: 50, highMax: 70, alertThreshold: 60, criticalThreshold: 85 },
  { category: 'compliance', lowMax: 30, mediumMax: 50, highMax: 70, alertThreshold: 55, criticalThreshold: 80 },
  { category: 'operational', lowMax: 20, mediumMax: 40, highMax: 60, alertThreshold: 45, criticalThreshold: 75 },
  { category: 'external', lowMax: 15, mediumMax: 35, highMax: 55, alertThreshold: 50, criticalThreshold: 70 },
  { category: 'human', lowMax: 20, mediumMax: 40, highMax: 65, alertThreshold: 55, criticalThreshold: 80 },
];
