export type InvestmentCategory = 
  | 'technology'
  | 'personnel'
  | 'training'
  | 'compliance'
  | 'incident-response'
  | 'monitoring'
  | 'infrastructure'
  | 'consulting';

export type BenefitType = 
  | 'risk-reduction'
  | 'cost-avoidance'
  | 'productivity'
  | 'compliance'
  | 'revenue-protection';

export interface SecurityInvestment {
  id: string;
  name: string;
  category: InvestmentCategory;
  description: string;
  initialCost: number;
  recurringCost: number;
  startDate: Date;
  endDate?: Date;
  vendor?: string;
  technologies?: string[];
  metrics: InvestmentMetric[];
}

export interface InvestmentMetric {
  name: string;
  baseline: number;
  current: number;
  target: number;
  unit: string;
  weight: number;
}

export interface SecurityBenefit {
  id: string;
  investmentId: string;
  type: BenefitType;
  description: string;
  quantifiedValue: number;
  currency: string;
  confidence: number;
  period: 'monthly' | 'quarterly' | 'annual';
  realizedDate?: Date;
}

export interface IncidentCost {
  id: string;
  incidentType: string;
  date: Date;
  directCost: number;
  indirectCost: number;
  downtime: number;
  affectedAssets: number;
  recordsCompromised?: number;
}

export interface RiskReduction {
  investmentId: string;
  riskCategory: string;
  beforeScore: number;
  afterScore: number;
  reduction: number;
  financialImpact: number;
}

export interface ROIResult {
  id: string;
  investmentId: string;
  calculatedAt: Date;
  period: { start: Date; end: Date };
  costs: {
    initial: number;
    recurring: number;
    total: number;
  };
  benefits: {
    riskReduction: number;
    costAvoidance: number;
    productivity: number;
    compliance: number;
    total: number;
  };
  roi: {
    percentage: number;
    ratio: number;
    paybackMonths: number;
    npv: number;
    irr?: number;
  };
  riskReductions: RiskReduction[];
  incidentsAvoided: number;
  estimatedSavings: number;
  confidence: number;
  breakdown: {
    category: InvestmentCategory;
    investment: number;
    return: number;
    roi: number;
  }[];
}

export interface ROISummary {
  totalInvestment: number;
  totalBenefits: number;
  overallROI: number;
  avgPaybackMonths: number;
  topPerformers: { investment: SecurityInvestment; roi: number }[];
  underperformers: { investment: SecurityInvestment; roi: number }[];
  byCategory: Record<InvestmentCategory, { investment: number; return: number; roi: number }>;
  trend: {
    period: string;
    roi: number;
  }[];
}

export interface ROIBenchmark {
  category: InvestmentCategory;
  industryAvgROI: number;
  yourROI: number;
  percentile: number;
}

export const INDUSTRY_BENCHMARKS: Partial<Record<InvestmentCategory, { avgROI: number; avgPayback: number }>> = {
  'technology': { avgROI: 150, avgPayback: 18 },
  'personnel': { avgROI: 200, avgPayback: 12 },
  'training': { avgROI: 300, avgPayback: 6 },
  'compliance': { avgROI: 120, avgPayback: 24 },
  'incident-response': { avgROI: 400, avgPayback: 8 },
  'monitoring': { avgROI: 180, avgPayback: 15 },
  'infrastructure': { avgROI: 140, avgPayback: 24 },
  'consulting': { avgROI: 250, avgPayback: 10 },
};

export const AVERAGE_INCIDENT_COSTS: Record<string, number> = {
  'ransomware': 4500000,
  'data-breach': 4350000,
  'phishing': 1500000,
  'ddos': 200000,
  'insider-threat': 15000000,
  'malware': 2500000,
  'web-attack': 190000,
  'zero-day': 8000000,
};
