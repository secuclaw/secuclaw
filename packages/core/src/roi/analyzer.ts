import type {
  SecurityInvestment,
  SecurityBenefit,
  IncidentCost,
  RiskReduction,
  ROIResult,
  ROISummary,
  ROIBenchmark,
  InvestmentCategory,
  BenefitType,
} from './types.js';
import { INDUSTRY_BENCHMARKS, AVERAGE_INCIDENT_COSTS } from './types.js';

export class ROIAnalyzer {
  private investments: Map<string, SecurityInvestment> = new Map();
  private benefits: Map<string, SecurityBenefit[]> = new Map();
  private incidents: IncidentCost[] = [];
  private riskReductions: RiskReduction[] = [];
  private results: Map<string, ROIResult> = new Map();

  registerInvestment(investment: SecurityInvestment): void {
    this.investments.set(investment.id, investment);
  }

  recordBenefit(benefit: SecurityBenefit): void {
    const existing = this.benefits.get(benefit.investmentId) || [];
    existing.push(benefit);
    this.benefits.set(benefit.investmentId, existing);
  }

  recordIncident(incident: IncidentCost): void {
    this.incidents.push(incident);
  }

  recordRiskReduction(reduction: RiskReduction): void {
    this.riskReductions.push(reduction);
  }

  calculateROI(
    investmentId: string,
    period: { start: Date; end: Date }
  ): ROIResult | null {
    const investment = this.investments.get(investmentId);
    if (!investment) return null;

    const monthsInPeriod = this.monthsBetween(period.start, period.end);
    
    const totalCosts = {
      initial: investment.initialCost,
      recurring: investment.recurringCost * monthsInPeriod,
      get total() {
        return this.initial + this.recurring;
      },
    };

    const benefits = this.calculateBenefits(investmentId, period);
    
    const riskReductions = this.riskReductions.filter(r => r.investmentId === investmentId);
    const riskReductionValue = riskReductions.reduce((sum, r) => sum + r.financialImpact, 0);

    const incidentsAvoided = this.estimateIncidentsAvoided(investment, period);
    const estimatedSavings = this.calculateIncidentSavings(investment, incidentsAvoided);

    const totalBenefits = {
      riskReduction: riskReductionValue,
      costAvoidance: estimatedSavings,
      productivity: benefits.productivity,
      compliance: benefits.compliance,
      get total() {
        return this.riskReduction + this.costAvoidance + this.productivity + this.compliance;
      },
    };

    const roi = this.calculateROIMetrics(totalCosts.total, totalBenefits.total, totalCosts.initial);
    
    const confidence = this.calculateConfidence(investmentId, period);

    const result: ROIResult = {
      id: `roi-${investmentId}-${Date.now()}`,
      investmentId,
      calculatedAt: new Date(),
      period,
      costs: totalCosts,
      benefits: totalBenefits,
      roi,
      riskReductions,
      incidentsAvoided,
      estimatedSavings,
      confidence,
      breakdown: this.generateBreakdown(investment, totalBenefits),
    };

    this.results.set(result.id, result);
    return result;
  }

  private calculateBenefits(
    investmentId: string,
    period: { start: Date; end: Date }
  ): { riskReduction: number; costAvoidance: number; productivity: number; compliance: number } {
    const benefits = this.benefits.get(investmentId) || [];
    const periodBenefits = benefits.filter(b => {
      if (!b.realizedDate) return true;
      return b.realizedDate >= period.start && b.realizedDate <= period.end;
    });

    const byType: Record<BenefitType, number> = {
      'risk-reduction': 0,
      'cost-avoidance': 0,
      'productivity': 0,
      'compliance': 0,
      'revenue-protection': 0,
    };

    for (const benefit of periodBenefits) {
      const annualized = benefit.period === 'monthly' ? benefit.quantifiedValue * 12 :
                        benefit.period === 'quarterly' ? benefit.quantifiedValue * 4 :
                        benefit.quantifiedValue;
      byType[benefit.type] += annualized * benefit.confidence;
    }

    return {
      riskReduction: byType['risk-reduction'],
      costAvoidance: byType['cost-avoidance'],
      productivity: byType['productivity'],
      compliance: byType['compliance'],
    };
  }

  private estimateIncidentsAvoided(investment: SecurityInvestment, _period: { start: Date; end: Date }): number {
    const baseRate = 0.1;
    
    const effectiveness = investment.metrics.reduce((sum, m) => {
      const improvement = (m.current - m.baseline) / Math.max(m.target - m.baseline, 1);
      return sum + improvement * m.weight;
    }, 0);

    return Math.round(12 * baseRate * effectiveness);
  }

  private calculateIncidentSavings(investment: SecurityInvestment, incidentsAvoided: number): number {
    const avgIncidentCost = Object.values(AVERAGE_INCIDENT_COSTS).reduce((a, b) => a + b, 0) / 
                           Object.keys(AVERAGE_INCIDENT_COSTS).length;

    const relevantTech = investment.technologies || [];
    let savingsMultiplier = 0.5;
    
    if (relevantTech.some(t => t.toLowerCase().includes('siem'))) savingsMultiplier += 0.1;
    if (relevantTech.some(t => t.toLowerCase().includes('edr'))) savingsMultiplier += 0.15;
    if (relevantTech.some(t => t.toLowerCase().includes('firewall'))) savingsMultiplier += 0.1;

    return incidentsAvoided * avgIncidentCost * savingsMultiplier;
  }

  private calculateROIMetrics(
    totalCosts: number,
    totalBenefits: number,
    initialCost: number
  ): { percentage: number; ratio: number; paybackMonths: number; npv: number; irr?: number } {
    const netBenefit = totalBenefits - totalCosts;
    const percentage = totalCosts > 0 ? (netBenefit / totalCosts) * 100 : 0;
    const ratio = totalCosts > 0 ? totalBenefits / totalCosts : 0;

    const monthlyBenefit = totalBenefits / 12;
    const paybackMonths = monthlyBenefit > 0 ? Math.ceil(initialCost / monthlyBenefit) : 999;

    const discountRate = 0.1;
    const npv = this.calculateNPV(initialCost, totalBenefits / 3, discountRate, 3);

    const irr = totalBenefits > totalCosts ? (totalBenefits / totalCosts - 1) * 100 : undefined;

    return { percentage, ratio, paybackMonths, npv, irr };
  }

  private calculateNPV(initialInvestment: number, annualCashFlow: number, rate: number, years: number): number {
    let npv = -initialInvestment;
    for (let i = 1; i <= years; i++) {
      npv += annualCashFlow / Math.pow(1 + rate, i);
    }
    return npv;
  }

  private calculateConfidence(investmentId: string, _period: { start: Date; end: Date }): number {
    const investment = this.investments.get(investmentId);
    if (!investment) return 0.5;

    let confidence = 0.5;

    const metrics = investment.metrics;
    if (metrics.length > 0) {
      const dataQuality = metrics.reduce((sum, m) => {
        return sum + (m.current > 0 ? 0.1 : 0);
      }, 0);
      confidence += Math.min(dataQuality, 0.3);
    }

    const benefits = this.benefits.get(investmentId) || [];
    if (benefits.length > 0) {
      const avgConfidence = benefits.reduce((sum, b) => sum + b.confidence, 0) / benefits.length;
      confidence += avgConfidence * 0.2;
    }

    return Math.min(confidence, 1);
  }

  private generateBreakdown(
    investment: SecurityInvestment,
    benefits: { riskReduction: number; costAvoidance: number; productivity: number; compliance: number }
  ): ROIResult['breakdown'] {
    const totalReturn = benefits.riskReduction + benefits.costAvoidance + benefits.productivity + benefits.compliance;
    
    return [
      {
        category: investment.category,
        investment: investment.initialCost + investment.recurringCost * 12,
        return: totalReturn,
        roi: investment.initialCost > 0 ? ((totalReturn - investment.initialCost) / investment.initialCost) * 100 : 0,
      },
    ];
  }

  getSummary(periodMonths: number = 12): ROISummary {
    const allResults = Array.from(this.results.values());
    const allInvestments = Array.from(this.investments.values());

    const totalInvestment = allInvestments.reduce((sum, i) => sum + i.initialCost + i.recurringCost * periodMonths, 0);
    const totalBenefits = allResults.reduce((sum, r) => sum + r.benefits.total, 0);
    const overallROI = totalInvestment > 0 ? ((totalBenefits - totalInvestment) / totalInvestment) * 100 : 0;

    const avgPaybackMonths = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.roi.paybackMonths, 0) / allResults.length
      : 0;

    const sortedByROI = [...allInvestments]
      .map(inv => {
        const result = allResults.find(r => r.investmentId === inv.id);
        return { investment: inv, roi: result?.roi.percentage || 0 };
      })
      .sort((a, b) => b.roi - a.roi);

    const topPerformers = sortedByROI.slice(0, 5);
    const underperformers = sortedByROI.filter(item => item.roi < 100).slice(-5);

    const byCategory: Record<InvestmentCategory, { investment: number; return: number; roi: number }> = {
      'technology': { investment: 0, return: 0, roi: 0 },
      'personnel': { investment: 0, return: 0, roi: 0 },
      'training': { investment: 0, return: 0, roi: 0 },
      'compliance': { investment: 0, return: 0, roi: 0 },
      'incident-response': { investment: 0, return: 0, roi: 0 },
      'monitoring': { investment: 0, return: 0, roi: 0 },
      'infrastructure': { investment: 0, return: 0, roi: 0 },
      'consulting': { investment: 0, return: 0, roi: 0 },
    };

    for (const inv of allInvestments) {
      const result = allResults.find(r => r.investmentId === inv.id);
      byCategory[inv.category].investment += inv.initialCost + inv.recurringCost * periodMonths;
      byCategory[inv.category].return += result?.benefits.total || 0;
    }

    for (const cat of Object.keys(byCategory) as InvestmentCategory[]) {
      const catData = byCategory[cat];
      catData.roi = catData.investment > 0 
        ? ((catData.return - catData.investment) / catData.investment) * 100 
        : 0;
    }

    const trend = this.calculateTrend();

    return {
      totalInvestment,
      totalBenefits,
      overallROI,
      avgPaybackMonths,
      topPerformers,
      underperformers,
      byCategory,
      trend,
    };
  }

  getBenchmarks(): ROIBenchmark[] {
    const allInvestments = Array.from(this.investments.values());
    const allResults = Array.from(this.results.values());
    const benchmarks: ROIBenchmark[] = [];

    const categoryROI: Partial<Record<InvestmentCategory, number[]>> = {};
    
    for (const inv of allInvestments) {
      const result = allResults.find(r => r.investmentId === inv.id);
      if (result) {
        if (!categoryROI[inv.category]) categoryROI[inv.category] = [];
        categoryROI[inv.category]!.push(result.roi.percentage);
      }
    }

    for (const [category, rois] of Object.entries(categoryROI) as [InvestmentCategory, number[]][]) {
      const benchmark = INDUSTRY_BENCHMARKS[category];
      if (benchmark && rois.length > 0) {
        const yourROI = rois.reduce((a, b) => a + b, 0) / rois.length;
        const percentile = yourROI >= benchmark.avgROI ? 75 :
                          yourROI >= benchmark.avgROI * 0.75 ? 50 : 25;

        benchmarks.push({
          category,
          industryAvgROI: benchmark.avgROI,
          yourROI,
          percentile,
        });
      }
    }

    return benchmarks;
  }

  private calculateTrend(): { period: string; roi: number }[] {
    const allResults = Array.from(this.results.values());
    if (allResults.length < 2) return [];

    const sortedResults = allResults.sort((a, b) => a.calculatedAt.getTime() - b.calculatedAt.getTime());
    
    return sortedResults.map(r => ({
      period: r.calculatedAt.toISOString().slice(0, 7),
      roi: r.roi.percentage,
    }));
  }

  private monthsBetween(start: Date, end: Date): number {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  getInvestment(investmentId: string): SecurityInvestment | undefined {
    return this.investments.get(investmentId);
  }

  listInvestments(): SecurityInvestment[] {
    return Array.from(this.investments.values());
  }

  getResult(resultId: string): ROIResult | undefined {
    return this.results.get(resultId);
  }

  listResults(): ROIResult[] {
    return Array.from(this.results.values());
  }

  getIncidents(since?: Date): IncidentCost[] {
    return since
      ? this.incidents.filter(i => i.date >= since)
      : this.incidents;
  }
}

export function createROIAnalyzer(): ROIAnalyzer {
  return new ROIAnalyzer();
}
