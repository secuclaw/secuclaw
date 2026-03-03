/**
 * Coverage Analyzer - 控制覆盖率分析器
 * 
 * 分析 SCF 安全控制对 MITRE ATT&CK 技术的覆盖情况
 */

import type { SCFControl, SCFDomain } from '../knowledge/scf/types.js';
import type { MITRETechnique, MITRETactic } from '../knowledge/mitre/types.js';
import type { SCFThreat } from '../knowledge/scf/threats.js';
import { SCF_DOMAINS, getSCFControl } from '../knowledge/scf/controls.js';
import { NT_THREATS, MT_THREATS } from '../knowledge/scf/threats.js';
import { scfMitreBridge, type SCFMITREMapping } from './scf-mitre-bridge.js';

// ============================================
// 类型定义
// ============================================

export interface CoverageReport {
  generatedAt: Date;
  totalControls: number;
  totalTechniques: number;
  overallCoverage: number;
  controlCoverage: ControlCoverageDetail[];
  techniqueCoverage: any[];
  uncoveredTechniques: any[];
  gapAnalysis: GapAnalysis[];
  recommendations: string[];
}

export interface ControlCoverageDetail {
  controlId: string;
  controlName: string;
  domain: string;
  category: string;
  techniquesCovered: number;
  techniquesPrevented: number;
  techniquesDetected: number;
  techniquesResponded: number;
  coverageScore: number;
  effectiveness: 'high' | 'medium' | 'low';
}

export interface GapAnalysis {
  gapId: string;
  category: 'uncovered_technique' | 'weak_control' | 'missing_layer' | 'redundancy';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedControls: string[];
  affectedTechniques: string[];
  remediation: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ThreatCoverageAnalysis {
  threatId: string;
  threatName: string;
  category: 'NT' | 'MT';
  severity: string;
  techniques: ThreatTechniqueCoverage[];
  overallRiskScore: number;
  residualRisk: number;
  coverageScore: number;
}

export interface ThreatTechniqueCoverage {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  controls: any[];
  isCovered: boolean;
  effectiveness: 'high' | 'medium' | 'low' | 'none';
}

export interface DomainCoverageSummary {
  domainCode: string;
  domainName: string;
  controlCount: number;
  techniqueCoverage: number;
  effectiveness: number;
  gaps: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================
// 分析器实现
// ============================================

export class CoverageAnalyzer {
  private allThreats: SCFThreat[];
  
  constructor() {
    this.allThreats = [...NT_THREATS, ...MT_THREATS];
  }
  
  /**
   * 生成完整的覆盖率报告
   */
  generateCoverageReport(allTechniques: MITRETechnique[]): CoverageReport {
    const controlCoverage = this.analyzeControlCoverage(allTechniques);
    const techniqueCoverage = this.analyzeTechniqueCoverage(allTechniques);
    const uncoveredTechniques = techniqueCoverage.filter((t: any) => t.uncovered);
    const gapAnalysis = this.analyzeGaps(techniqueCoverage, controlCoverage);
    const recommendations = this.generateRecommendations(gapAnalysis, controlCoverage);
    
    return {
      generatedAt: new Date(),
      totalControls: SCF_DOMAINS.reduce((sum, d) => sum + d.controls.length, 0),
      totalTechniques: allTechniques.length,
      overallCoverage: this.calculateOverallCoverage(techniqueCoverage),
      controlCoverage,
      techniqueCoverage,
      uncoveredTechniques,
      gapAnalysis,
      recommendations,
    };
  }
  
  private analyzeTechniqueCoverage(allTechniques: MITRETechnique[]): any[] {
    const coverage: any[] = [];
    for (const tech of allTechniques) {
      const mappings = scfMitreBridge.getControlsByTechnique(tech.id);
      const tactic = tech.tacticIds.length > 0 ? tech.tacticIds[0] : 'Unknown';
      coverage.push({
        techniqueId: tech.id,
        techniqueName: scfMitreBridge.getTechniqueNameById(tech.id),
        tactic,
        coveredBy: mappings,
        uncovered: mappings.length === 0,
        riskLevel: mappings.length === 0 ? 'high' : mappings.length < 3 ? 'medium' : 'low',
      });
    }
    return coverage;
  }
  
  /**
   * 分析每个控制的覆盖情况
   */
  private analyzeControlCoverage(allTechniques: MITRETechnique[]): ControlCoverageDetail[] {
    const coverage: ControlCoverageDetail[] = [];
    
    for (const domain of SCF_DOMAINS) {
      for (const control of domain.controls) {
        const mappings = scfMitreBridge.getTechniquesByControl(control.id);
        
        const prevented = mappings.filter(m => m.relationship === 'prevents');
        const detected = mappings.filter(m => m.relationship === 'detects');
        const responded = mappings.filter(m => m.relationship === 'responds');
        
        const allMapped = [...new Set(mappings.map(m => m.mitreTechniqueId))];
        const coverageScore = allTechniques.length > 0
          ? (allMapped.length / allTechniques.length) * 100
          : 0;
        
        const avgConfidence = mappings.length > 0
          ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
          : 0;
        
        coverage.push({
          controlId: control.id,
          controlName: control.name,
          domain: domain.code,
          category: control.category,
          techniquesCovered: allMapped.length,
          techniquesPrevented: prevented.length,
          techniquesDetected: detected.length,
          techniquesResponded: responded.length,
          coverageScore,
          effectiveness: avgConfidence >= 0.8 ? 'high' : 
                         avgConfidence >= 0.6 ? 'medium' : 'low',
        });
      }
    }
    
    return coverage.sort((a, b) => b.coverageScore - a.coverageScore);
  }
  
  /**
   * 计算整体覆盖率
   */
  private calculateOverallCoverage(techniqueCoverage: any[]): number {
    if (techniqueCoverage.length === 0) return 0;
    
    const covered = techniqueCoverage.filter((t: any) => !t.uncovered).length;
    return (covered / techniqueCoverage.length) * 100;
  }
  
  /**
   * 分析差距
   */
  private analyzeGaps(
    techniqueCoverage: any[],
    controlCoverage: ControlCoverageDetail[]
  ): GapAnalysis[] {
    const gaps: GapAnalysis[] = [];
    
    // 未覆盖的技术
    for (const tech of techniqueCoverage.filter((t: any) => t.uncovered)) {
      gaps.push({
        gapId: `gap-uncovered-${tech.techniqueId}`,
        category: 'uncovered_technique',
        severity: tech.riskLevel,
        description: `MITRE 技术 ${tech.techniqueId} (${tech.techniqueName}) 没有任何 SCF 控制覆盖`,
        affectedControls: [],
        affectedTechniques: [tech.techniqueId],
        remediation: [
          '评估是否需要添加新的安全控制',
          '考虑是否可以通过现有控制的增强来覆盖',
        ],
        estimatedEffort: 'high',
      });
    }
    
    // 低效控制
    for (const control of controlCoverage.filter(c => c.effectiveness === 'low')) {
      if (control.techniquesCovered > 0) {
        gaps.push({
          gapId: `gap-weak-${control.controlId}`,
          category: 'weak_control',
          severity: 'medium',
          description: `控制 ${control.controlId} (${control.controlName}) 覆盖了 ${control.techniquesCovered} 个技术，但有效性较低`,
          affectedControls: [control.controlId],
          affectedTechniques: [],
          remediation: [
            '提升控制的实施质量',
            '增加额外的技术控制措施',
          ],
          estimatedEffort: 'medium',
        });
      }
    }
    
    return gaps;
  }
  
  /**
   * 生成建议
   */
  private generateRecommendations(
    gaps: GapAnalysis[],
    controlCoverage: ControlCoverageDetail[]
  ): string[] {
    const recommendations: string[] = [];
    
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    const highGaps = gaps.filter(g => g.severity === 'high');
    
    if (criticalGaps.length > 0) {
      recommendations.push(`立即处理 ${criticalGaps.length} 个高危差距`);
    }
    
    if (highGaps.length > 0) {
      recommendations.push(`规划处理 ${highGaps.length} 个高中危差距`);
    }
    
    const lowEffectiveness = controlCoverage.filter(c => c.effectiveness === 'low');
    if (lowEffectiveness.length > 0) {
      recommendations.push(`提升 ${lowEffectiveness.length} 个低效控制的有效性`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('安全控制覆盖良好，建议持续监控和优化');
    }
    
    return recommendations;
  }
  
  /**
   * 分析特定威胁的覆盖情况
   */
  analyzeThreatCoverage(threats?: SCFThreat[]): ThreatCoverageAnalysis[] {
    const targetThreats = threats || this.allThreats;
    const analyses: ThreatCoverageAnalysis[] = [];
    
    const severityScore: Record<string, number> = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };
    
    for (const threat of targetThreats) {
      const techniques: ThreatTechniqueCoverage[] = [];
      let totalCoverage = 0;
      
      for (const techId of threat.mitreMapping.techniques) {
        const mappings = scfMitreBridge.getControlsByTechnique(techId);
        
        const controls = mappings.map(m => ({
          controlId: m.scfControlId,
          controlName: m.scfControlName,
          relationship: m.relationship,
          confidence: m.confidence,
        }));
        
        const isCovered = controls.length > 0;
        const avgConfidence = controls.length > 0
          ? controls.reduce((sum: number, c: any) => sum + c.confidence, 0) / controls.length
          : 0;
        
        if (isCovered) totalCoverage += avgConfidence;
        
        const tactic = threat.mitreMapping.tactics[
          threat.mitreMapping.techniques.indexOf(techId)
        ] || 'Unknown';
        
        techniques.push({
          techniqueId: techId,
          techniqueName: scfMitreBridge.getTechniqueNameById(techId) || techId,
          tactic,
          controls,
          isCovered,
          effectiveness: !isCovered ? 'none' :
                         avgConfidence >= 0.8 ? 'high' :
                         avgConfidence >= 0.6 ? 'medium' : 'low',
        });
      }
      
      const baseRisk = severityScore[threat.severity] || 0.5;
      const coverageScore = threat.mitreMapping.techniques.length > 0
        ? totalCoverage / threat.mitreMapping.techniques.length
        : 0;
      const residualRisk = baseRisk * (1 - coverageScore);
      
      analyses.push({
        threatId: threat.id,
        threatName: threat.name,
        category: threat.category,
        severity: threat.severity,
        techniques,
        overallRiskScore: baseRisk,
        residualRisk,
        coverageScore,
      });
    }
    
    return analyses.sort((a, b) => b.residualRisk - a.residualRisk);
  }
  
  /**
   * 获取域级覆盖摘要
   */
  getDomainCoverageSummary(): DomainCoverageSummary[] {
    return SCF_DOMAINS.map(domain => {
      const controls = domain.controls;
      let totalCoverage = 0;
      let totalEffectiveness = 0;
      let gapCount = 0;
      
      for (const control of controls) {
        const mappings = scfMitreBridge.getTechniquesByControl(control.id);
        const uniqueTechs = new Set(mappings.map(m => m.mitreTechniqueId));
        
        totalCoverage += uniqueTechs.size;
        
        if (mappings.length > 0) {
          totalEffectiveness += mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
        } else {
          gapCount++;
        }
      }
      
      const techniqueCoverage = controls.length > 0 ? totalCoverage / controls.length : 0;
      const effectiveness = controls.length > 0 ? totalEffectiveness / controls.length : 0;
      
      return {
        domainCode: domain.code,
        domainName: domain.name,
        controlCount: controls.length,
        techniqueCoverage,
        effectiveness,
        gaps: gapCount,
        priority: effectiveness < 0.3 ? 'critical' :
                  effectiveness < 0.6 ? 'high' :
                  effectiveness < 0.8 ? 'medium' : 'low',
      };
    });
  }
  
  /**
   * 计算整体风险评分
   */
  calculateOverallRiskScore(threats?: SCFThreat[]): number {
    const analyses = this.analyzeThreatCoverage(threats);
    
    if (analyses.length === 0) return 0;
    
    const weightedSum = analyses.reduce((sum, a) => sum + a.residualRisk * (a.overallRiskScore || 0.5), 0);
    const totalWeight = analyses.reduce((sum, a) => sum + (a.overallRiskScore || 0.5), 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}

// ============================================
// 单例导出
// ============================================

export const coverageAnalyzer = new CoverageAnalyzer();

// ============================================
// 便捷函数
// ============================================

export function generateCoverageReport(allTechniques: MITRETechnique[]): CoverageReport {
  return coverageAnalyzer.generateCoverageReport(allTechniques);
}

export function analyzeThreatCoverage(threats?: SCFThreat[]): ThreatCoverageAnalysis[] {
  return coverageAnalyzer.analyzeThreatCoverage(threats);
}

export function getDomainCoverageSummary(): DomainCoverageSummary[] {
  return coverageAnalyzer.getDomainCoverageSummary();
}
