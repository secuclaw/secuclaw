import type {
  RiskLevel,
  RiskCategory,
  RiskFactor,
  RiskScore,
  RiskEvent,
  RiskThreshold,
  RiskTrend,
  RiskAssessment,
  RiskRecommendation,
} from './engine-types.js';
import { RISK_LEVELS, DEFAULT_THRESHOLDS } from './engine-types.js';

export class RiskScoringEngine {
  private factors: Map<string, RiskFactor> = new Map();
  private events: RiskEvent[] = [];
  private thresholds: Map<RiskCategory, RiskThreshold> = new Map();
  private scoreHistory: RiskScore[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    for (const threshold of DEFAULT_THRESHOLDS) {
      this.thresholds.set(threshold.category, threshold);
    }
  }

  registerFactor(factor: RiskFactor): void {
    this.factors.set(factor.id, factor);
  }

  ingestEvent(event: RiskEvent): void {
    this.events.push(event);
    
    this.updateFactorsFromEvent(event);
    
    this.events = this.events.filter(
      e => e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
  }

  private updateFactorsFromEvent(event: RiskEvent): void {
    const factorId = `${event.category}-${event.type}`;
    
    const existingFactor = this.factors.get(factorId);
    
    if (existingFactor) {
      const impact = event.mitigated 
        ? event.impact * (1 - (event.mitigationFactor || 0.5))
        : event.impact;
      
      existingFactor.currentValue = Math.min(
        existingFactor.maxValue,
        existingFactor.currentValue + impact * event.probability
      );
      existingFactor.lastUpdated = new Date();
      existingFactor.trend = 'increasing';
    } else {
      this.factors.set(factorId, {
        id: factorId,
        category: event.category,
        name: `${event.type} risk`,
        description: `Dynamic risk factor for ${event.type} events`,
        weight: this.getWeightForCategory(event.category),
        maxValue: 100,
        currentValue: event.mitigated 
          ? event.impact * (1 - (event.mitigationFactor || 0.5))
          : event.impact,
        trend: 'increasing',
        lastUpdated: new Date(),
        source: event.source,
      });
    }
  }

  private getWeightForCategory(category: RiskCategory): number {
    const weights: Record<RiskCategory, number> = {
      threat: 1.2,
      vulnerability: 1.0,
      compliance: 0.9,
      operational: 0.8,
      external: 1.1,
      human: 1.0,
    };
    return weights[category] || 1.0;
  }

  calculateScore(): RiskScore {
    const factors = Array.from(this.factors.values());
    const breakdown: Partial<Record<RiskCategory, number>> = {};
    
    for (const category of this.thresholds.keys()) {
      const categoryFactors = factors.filter(f => f.category === category);
      if (categoryFactors.length === 0) {
        breakdown[category] = 0;
        continue;
      }
      
      const weightedSum = categoryFactors.reduce(
        (sum, f) => sum + (f.currentValue / f.maxValue) * f.weight,
        0
      );
      const totalWeight = categoryFactors.reduce((sum, f) => sum + f.weight, 0);
      
      breakdown[category] = (weightedSum / totalWeight) * 100;
    }

    const categoryScores = Object.values(breakdown) as number[];
    const overall = categoryScores.length > 0
      ? categoryScores.reduce((sum, s) => sum + s, 0) / categoryScores.length
      : 0;

    const score: RiskScore = {
      id: `score-${Date.now()}`,
      timestamp: new Date(),
      overall: Math.min(100, Math.max(0, overall)),
      level: this.getLevel(overall),
      factors,
      breakdown: breakdown as Record<RiskCategory, number>,
      confidence: this.calculateConfidence(factors),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    this.scoreHistory.push(score);
    
    if (this.scoreHistory.length > this.maxHistorySize) {
      this.scoreHistory = this.scoreHistory.slice(-this.maxHistorySize);
    }

    return score;
  }

  assessAsset(
    assetId: string,
    assetName: string,
    assetType: RiskAssessment['assetType'],
    exposures: {
      mitreTechniques: string[];
      vulnerabilities: number;
      threats: number;
    }
  ): RiskAssessment {
    const relevantFactors = Array.from(this.factors.values())
      .filter(f => f.source === assetId || this.isRelevantToAsset(f, assetId));

    const score = relevantFactors.length > 0
      ? relevantFactors.reduce((sum, f) => sum + (f.currentValue / f.maxValue) * f.weight, 0) /
        relevantFactors.reduce((sum, f) => sum + f.weight, 0) * 100
      : 0;

    const recommendations = this.generateRecommendations(
      relevantFactors,
      exposures,
      assetType
    );

    return {
      id: `assessment-${assetId}-${Date.now()}`,
      assetId,
      assetName,
      assetType,
      score: Math.min(100, Math.max(0, score)),
      level: this.getLevel(score),
      factors: relevantFactors,
      exposure: exposures,
      businessImpact: {
        confidentiality: this.assessCIA(relevantFactors, 'confidentiality'),
        integrity: this.assessCIA(relevantFactors, 'integrity'),
        availability: this.assessCIA(relevantFactors, 'availability'),
      },
      recommendations,
      lastAssessed: new Date(),
    };
  }

  private assessCIA(factors: RiskFactor[], dimension: 'confidentiality' | 'integrity' | 'availability'): number {
    const dimensionWeights: Record<string, Record<string, number>> = {
      confidentiality: { threat: 1.2, vulnerability: 1.0, operational: 0.7 },
      integrity: { threat: 1.0, vulnerability: 1.1, operational: 0.9 },
      availability: { threat: 0.9, vulnerability: 1.0, operational: 1.2 },
    };

    const weights = dimensionWeights[dimension];
    let score = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const weight = weights[factor.category] || 1.0;
      score += (factor.currentValue / factor.maxValue) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(100, (score / totalWeight) * 100) : 0;
  }

  private isRelevantToAsset(factor: RiskFactor, assetId: string): boolean {
    const relevantEvents = this.events.filter(
      e => e.affectedAssets.includes(assetId) && e.category === factor.category
    );
    return relevantEvents.length > 0;
  }

  private generateRecommendations(
    factors: RiskFactor[],
    exposures: { mitreTechniques: string[]; vulnerabilities: number; threats: number },
    _assetType: string
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];
    let priority = 1;

    if (exposures.vulnerabilities > 10) {
      recommendations.push({
        id: `rec-vuln-${priority}`,
        priority: priority++,
        title: 'Patch Critical Vulnerabilities',
        description: `Address ${exposures.vulnerabilities} vulnerabilities to reduce attack surface`,
        riskReduction: 25,
        effort: 'medium',
        cost: 'low',
      });
    }

    if (exposures.threats > 5) {
      recommendations.push({
        id: `rec-threat-${priority}`,
        priority: priority++,
        title: 'Implement Threat Detection',
        description: 'Deploy additional threat detection capabilities',
        riskReduction: 20,
        effort: 'high',
        cost: 'medium',
      });
    }

    const criticalFactors = factors.filter(f => f.currentValue > 70);
    for (const factor of criticalFactors.slice(0, 3)) {
      recommendations.push({
        id: `rec-factor-${factor.id}`,
        priority: priority++,
        title: `Address ${factor.name}`,
        description: `Reduce ${factor.name.toLowerCase()} risk factor`,
        riskReduction: 15,
        effort: 'medium',
        cost: 'low',
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  getTrend(period: 'hour' | 'day' | 'week' | 'month' = 'day'): RiskTrend {
    const now = Date.now();
    const periodMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - periodMs[period];
    const relevantScores = this.scoreHistory.filter(s => s.timestamp.getTime() >= cutoff);

    const data = relevantScores.map(s => ({
      timestamp: s.timestamp,
      score: s.overall,
      level: s.level,
    }));

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    let changeRate = 0;

    if (data.length >= 2) {
      const first = data[0].score;
      const last = data[data.length - 1].score;
      changeRate = ((last - first) / Math.max(first, 1)) * 100;
      
      if (changeRate > 5) direction = 'declining';
      else if (changeRate < -5) direction = 'improving';
    }

    return { period, data, direction, changeRate };
  }

  setThreshold(category: RiskCategory, threshold: RiskThreshold): void {
    this.thresholds.set(category, threshold);
  }

  getThreshold(category: RiskCategory): RiskThreshold | undefined {
    return this.thresholds.get(category);
  }

  private getLevel(score: number): RiskLevel {
    if (score >= RISK_LEVELS.critical.min) return 'critical';
    if (score >= RISK_LEVELS.high.min) return 'high';
    if (score >= RISK_LEVELS.medium.min) return 'medium';
    return 'low';
  }

  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    const recencyScore = factors.reduce((sum, f) => {
      const ageMs = Date.now() - f.lastUpdated.getTime();
      const ageHours = ageMs / (60 * 60 * 1000);
      return sum + Math.max(0, 1 - ageHours / 24);
    }, 0) / factors.length;

    const coverageScore = Math.min(1, factors.length / 6);

    const sourceDiversity = new Set(factors.map(f => f.source)).size / Math.max(factors.length, 1);

    return (recencyScore * 0.4 + coverageScore * 0.4 + sourceDiversity * 0.2);
  }

  getFactor(factorId: string): RiskFactor | undefined {
    return this.factors.get(factorId);
  }

  listFactors(category?: RiskCategory): RiskFactor[] {
    const all = Array.from(this.factors.values());
    return category ? all.filter(f => f.category === category) : all;
  }

  getEvents(since?: Date): RiskEvent[] {
    return since
      ? this.events.filter(e => e.timestamp >= since)
      : this.events;
  }

  getScoreHistory(limit: number = 100): RiskScore[] {
    return this.scoreHistory.slice(-limit);
  }

  decayFactors(decayRate: number = 0.95): void {
    for (const factor of this.factors.values()) {
      factor.currentValue *= decayRate;
      factor.trend = 'decreasing';
      factor.lastUpdated = new Date();
    }
  }

  reset(): void {
    this.factors.clear();
    this.events = [];
    this.scoreHistory = [];
  }
}

export function createRiskScoringEngine(): RiskScoringEngine {
  return new RiskScoringEngine();
}
