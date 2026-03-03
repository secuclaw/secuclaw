import type {
  ComplianceFramework,
  ComplianceControl,
  ComplianceAssessment,
  ComplianceGap,
  ComplianceReport,
  ComplianceStatus,
  ComplianceSeverity,
  AssessmentType,
} from "./types.js";
import { SCF_DOMAINS, FRAMEWORK_MAPPINGS } from "./types.js";
import type { SCFLoader } from "../knowledge/scf/loader.js";

type ReportCallback = (report: ComplianceReport) => void;
type GapCallback = (gap: ComplianceGap) => void;

export class ComplianceAnalyzer {
  private scfLoader?: SCFLoader;
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private controls: Map<string, ComplianceControl> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private gaps: Map<string, ComplianceGap> = new Map();
  private reportCallbacks: Set<ReportCallback> = new Set();
  private gapCallbacks: Set<GapCallback> = new Set();

  constructor(scfLoader?: SCFLoader) {
    this.scfLoader = scfLoader;
    this.initDefaultFrameworks();
    this.initDefaultControls();
  }

  private initDefaultFrameworks(): void {
    for (const [id, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      this.frameworks.set(id, {
        id,
        name: framework.name,
        version: framework.version,
        description: `${framework.name} 合规框架`,
        domains: framework.domains,
        totalControls: 0,
        mandatoryControls: 0,
      });
    }

    this.frameworks.set("SCF", {
      id: "SCF",
      name: "Secure Controls Framework",
      version: "2025.4",
      description: "统一安全控制框架，整合NIST、ISO、PCI等262个权威来源",
      domains: SCF_DOMAINS.map((d) => d.code),
      totalControls: 1451,
      mandatoryControls: 485,
    });
  }

  private initDefaultControls(): void {
    const defaultControls: ComplianceControl[] = [
      {
        id: "SCF-GOV-01",
        domain: "GOV",
        name: "安全治理体系",
        description: "建立并维护网络安全治理体系",
        requirement: "组织应建立、实施、维护和持续改进信息安全管理体系",
        severity: "critical",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.5.1" },
          { framework: "NIST_CSF", controlId: "ID.GV-1" },
          { framework: "CSL", controlId: "网络运行安全-1" },
        ],
      },
      {
        id: "SCF-IAM-01",
        domain: "IAM",
        name: "访问控制策略",
        description: "建立并执行访问控制策略和程序",
        requirement: "基于业务需求和安全要求建立访问控制规则",
        severity: "critical",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.5.15" },
          { framework: "NIST_CSF", controlId: "PR.AC-1" },
          { framework: "PCI_DSS", controlId: "7.1" },
        ],
      },
      {
        id: "SCF-VPM-01",
        domain: "VPM",
        name: "漏洞管理",
        description: "建立漏洞扫描和修复流程",
        requirement: "定期扫描系统漏洞，及时修复高危漏洞",
        severity: "high",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.8.8" },
          { framework: "NIST_CSF", controlId: "ID.RA-1" },
          { framework: "PCI_DSS", controlId: "6.2" },
        ],
      },
      {
        id: "SCF-IR-01",
        domain: "IR",
        name: "事件响应计划",
        description: "建立安全事件响应计划和程序",
        requirement: "制定并测试安全事件响应计划",
        severity: "critical",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.5.24" },
          { framework: "NIST_CSF", controlId: "RS.RP-1" },
          { framework: "CSL", controlId: "监测预警-1" },
        ],
      },
      {
        id: "SCF-NET-01",
        domain: "NET",
        name: "网络安全控制",
        description: "实施网络边界和内部安全控制",
        requirement: "建立网络分层防护体系",
        severity: "high",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.8.20" },
          { framework: "NIST_CSF", controlId: "PR.AC-5" },
          { framework: "PCI_DSS", controlId: "1.1" },
        ],
      },
      {
        id: "SCF-PRV-01",
        domain: "PRV",
        name: "隐私保护",
        description: "建立个人信息保护机制",
        requirement: "符合个人信息保护法要求",
        severity: "critical",
        mandatory: true,
        mappings: [
          { framework: "PIPL", controlId: "处理规则-1" },
          { framework: "GDPR", controlId: "Art.5" },
          { framework: "ISO_27001", controlId: "A.5.33" },
        ],
      },
      {
        id: "SCF-CLD-01",
        domain: "CLD",
        name: "云安全",
        description: "云服务安全配置与管理",
        requirement: "确保云环境安全配置和责任共担",
        severity: "high",
        mandatory: false,
        mappings: [
          { framework: "ISO_27001", controlId: "A.5.23" },
          { framework: "NIST_CSF", controlId: "ID.SC-1" },
        ],
      },
      {
        id: "SCF-TPM-01",
        domain: "TPM",
        name: "第三方风险管理",
        description: "供应商和第三方安全管理",
        requirement: "对第三方进行安全评估和持续监控",
        severity: "high",
        mandatory: true,
        mappings: [
          { framework: "ISO_27001", controlId: "A.5.19" },
          { framework: "NIST_CSF", controlId: "ID.SC-2" },
          { framework: "PCI_DSS", controlId: "12.8" },
        ],
      },
    ];

    for (const control of defaultControls) {
      this.controls.set(control.id, control);
    }
  }

  getFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  getFramework(id: string): ComplianceFramework | undefined {
    return this.frameworks.get(id);
  }

  getControls(domain?: string): ComplianceControl[] {
    const all = Array.from(this.controls.values());
    if (domain) {
      return all.filter((c) => c.domain === domain);
    }
    return all;
  }

  getControl(id: string): ComplianceControl | undefined {
    return this.controls.get(id);
  }

  assessControl(
    controlId: string,
    status: ComplianceStatus,
    options: {
      evidence?: string[];
      assessedBy?: string;
      assessmentType?: AssessmentType;
    } = {}
  ): ComplianceAssessment {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const score = this.calculateScore(status, control.severity);

    const assessment: ComplianceAssessment = {
      id: `assess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      controlId,
      status,
      score,
      evidence: options.evidence,
      gaps: [],
      assessedAt: Date.now(),
      assessedBy: options.assessedBy || "system",
      assessmentType: options.assessmentType || "self_assessment",
    };

    if (status !== "compliant" && status !== "not_applicable") {
      const gap = this.createGap(control, assessment);
      assessment.gaps.push(gap);
      this.gaps.set(gap.id, gap);
      this.notifyGapCallbacks(gap);
    }

    this.assessments.set(assessment.id, assessment);

    return assessment;
  }

  private calculateScore(status: ComplianceStatus, severity: ComplianceSeverity): number {
    const statusScores: Record<ComplianceStatus, number> = {
      compliant: 100,
      partially_compliant: 60,
      non_compliant: 0,
      not_applicable: 100,
      not_assessed: 0,
    };

    const severityWeights: Record<ComplianceSeverity, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
    };

    const baseScore = statusScores[status];
    const weight = severityWeights[severity];

    return Math.round(baseScore * weight);
  }

  private createGap(control: ComplianceControl, assessment: ComplianceAssessment): ComplianceGap {
    const severityPriority: Record<ComplianceSeverity, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };

    const statusPenalty: Record<ComplianceStatus, number> = {
      non_compliant: 0,
      partially_compliant: 20,
      compliant: 0,
      not_applicable: 0,
      not_assessed: 30,
    };

    const priority = severityPriority[control.severity] - statusPenalty[assessment.status];

    return {
      id: `gap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      controlId: control.id,
      controlName: control.name,
      domain: control.domain,
      severity: control.severity,
      description: `${control.name} 未满足合规要求`,
      impact: this.assessImpact(control),
      recommendation: this.generateRecommendation(control),
      effort: this.assessEffort(control),
      cost: this.assessCost(control),
      priority: Math.max(priority, 0),
      relatedControls: this.findRelatedControls(control),
    };
  }

  private assessImpact(control: ComplianceControl): string {
    const impacts: Record<ComplianceSeverity, string> = {
      critical: "可能导致重大安全事件、监管处罚或业务中断",
      high: "可能影响核心业务安全或合规状态",
      medium: "可能造成局部安全风险",
      low: "影响较小，建议改进",
    };
    return impacts[control.severity];
  }

  private generateRecommendation(control: ComplianceControl): string {
    const recommendations: Record<string, string> = {
      GOV: "建立完善的安全治理架构，明确责任和权限",
      IAM: "实施最小权限原则，加强身份认证和访问审计",
      VPM: "建立漏洞管理流程，定期扫描和修复",
      IR: "制定事件响应计划，定期演练",
      NET: "加固网络边界，实施纵深防御",
      PRV: "建立隐私保护机制，确保合规",
      CLD: "遵循云安全最佳实践，明确责任边界",
      TPM: "建立供应商安全评估流程",
    };
    return recommendations[control.domain] || `按照 ${control.name} 要求进行整改`;
  }

  private assessEffort(control: ComplianceControl): "low" | "medium" | "high" {
    const highEffortDomains = ["GOV", "IR", "BCD"];
    const lowEffortDomains = ["CFG", "MON"];

    if (highEffortDomains.includes(control.domain)) return "high";
    if (lowEffortDomains.includes(control.domain)) return "low";
    return "medium";
  }

  private assessCost(control: ComplianceControl): "low" | "medium" | "high" {
    const highCostDomains = ["NET", "CLD", "CRY"];
    const lowCostDomains = ["SAT", "CHG"];

    if (highCostDomains.includes(control.domain)) return "high";
    if (lowCostDomains.includes(control.domain)) return "low";
    return "medium";
  }

  private findRelatedControls(control: ComplianceControl): string[] {
    const related: string[] = [];

    for (const mapping of control.mappings) {
      for (const [id, c] of this.controls) {
        if (id === control.id) continue;
        if (c.mappings.some((m) => m.framework === mapping.framework && m.controlId === mapping.controlId)) {
          related.push(id);
        }
      }
    }

    return [...new Set(related)].slice(0, 5);
  }

  generateReport(
    framework: string,
    name?: string
  ): ComplianceReport {
    const allAssessments = Array.from(this.assessments.values());
    const allControls = Array.from(this.controls.values());
    const fw = this.frameworks.get(framework) || this.frameworks.get("SCF")!;

    const summary = {
      totalControls: allControls.length,
      compliant: allAssessments.filter((a) => a.status === "compliant").length,
      partiallyCompliant: allAssessments.filter((a) => a.status === "partially_compliant").length,
      nonCompliant: allAssessments.filter((a) => a.status === "non_compliant").length,
      notApplicable: allAssessments.filter((a) => a.status === "not_applicable").length,
      notAssessed: allControls.length - allAssessments.length,
      overallScore: 0,
      complianceRate: 0,
    };

    const assessedControls = allAssessments.filter((a) => a.status !== "not_assessed");
    if (assessedControls.length > 0) {
      summary.overallScore = Math.round(
        assessedControls.reduce((sum, a) => sum + a.score, 0) / assessedControls.length
      );
      summary.complianceRate =
        (summary.compliant + summary.partiallyCompliant * 0.6) / allControls.length;
    }

    const domainScores = SCF_DOMAINS.map((domain) => {
      const domainControls = allControls.filter((c) => c.domain === domain.code);
      const domainAssessments = domainControls
        .map((c) => allAssessments.find((a) => a.controlId === c.id))
        .filter((a): a is ComplianceAssessment => a !== undefined);

      const score =
        domainAssessments.length > 0
          ? Math.round(
              domainAssessments.reduce((sum, a) => sum + a.score, 0) / domainAssessments.length
            )
          : 0;

      return {
        domain: domain.code,
        score,
        compliantCount: domainAssessments.filter((a) => a.status === "compliant").length,
        totalCount: domainControls.length,
      };
    });

    const criticalGaps = Array.from(this.gaps.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);

    const recommendations = this.generateOverallRecommendations(summary, criticalGaps);

    const timeline = this.generateTimeline(criticalGaps);

    const report: ComplianceReport = {
      id: `report-${Date.now()}`,
      name: name || `${fw.name} 合规评估报告`,
      framework: framework,
      generatedAt: Date.now(),
      summary,
      domainScores,
      criticalGaps,
      recommendations,
      timeline,
    };

    this.notifyReportCallbacks(report);

    return report;
  }

  private generateOverallRecommendations(
    summary: ComplianceReport["summary"],
    gaps: ComplianceGap[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.complianceRate < 0.6) {
      recommendations.push("合规率较低，建议优先处理关键差距");
    }

    if (summary.notAssessed > summary.totalControls * 0.3) {
      recommendations.push("大量控制未评估，建议完成全面评估");
    }

    const criticalGaps = gaps.filter((g) => g.severity === "critical");
    if (criticalGaps.length > 0) {
      recommendations.push(`存在${criticalGaps.length}个关键差距，需立即处理`);
    }

    const domainGapCount = new Map<string, number>();
    for (const gap of gaps) {
      domainGapCount.set(gap.domain, (domainGapCount.get(gap.domain) || 0) + 1);
    }

    const topProblemDomains = Array.from(domainGapCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [domain, count] of topProblemDomains) {
      const domainInfo = SCF_DOMAINS.find((d) => d.code === domain);
      recommendations.push(`加强${domainInfo?.name || domain}领域控制，发现${count}个差距`);
    }

    return recommendations.slice(0, 10);
  }

  private generateTimeline(gaps: ComplianceGap[]): ComplianceReport["timeline"] {
    const sortedGaps = [...gaps].sort((a, b) => b.priority - a.priority);
    const timeline: ComplianceReport["timeline"] = [];

    const now = new Date();
    for (let i = 0; i < Math.min(sortedGaps.length, 5); i++) {
      const gap = sortedGaps[i];
      const targetDate = new Date(now);

      if (gap.severity === "critical") {
        targetDate.setDate(targetDate.getDate() + 7);
      } else if (gap.severity === "high") {
        targetDate.setDate(targetDate.getDate() + 30);
      } else {
        targetDate.setDate(targetDate.getDate() + 90);
      }

      timeline.push({
        date: targetDate.toISOString().split("T")[0],
        action: `整改: ${gap.controlName}`,
      });
    }

    return timeline;
  }

  getGaps(domain?: string): ComplianceGap[] {
    const all = Array.from(this.gaps.values());
    if (domain) {
      return all.filter((g) => g.domain === domain);
    }
    return all;
  }

  getAssessments(controlId?: string): ComplianceAssessment[] {
    const all = Array.from(this.assessments.values());
    if (controlId) {
      return all.filter((a) => a.controlId === controlId);
    }
    return all;
  }

  onReport(callback: ReportCallback): () => void {
    this.reportCallbacks.add(callback);
    return () => this.reportCallbacks.delete(callback);
  }

  onGap(callback: GapCallback): () => void {
    this.gapCallbacks.add(callback);
    return () => this.gapCallbacks.delete(callback);
  }

  private notifyReportCallbacks(report: ComplianceReport): void {
    for (const callback of this.reportCallbacks) {
      try {
        callback(report);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private notifyGapCallbacks(gap: ComplianceGap): void {
    for (const callback of this.gapCallbacks) {
      try {
        callback(gap);
      } catch {
        // Ignore callback errors
      }
    }
  }

  addControl(control: ComplianceControl): void {
    this.controls.set(control.id, control);
  }

  addFramework(framework: ComplianceFramework): void {
    this.frameworks.set(framework.id, framework);
  }

  getStatistics(): {
    totalControls: number;
    assessedControls: number;
    totalGaps: number;
    criticalGaps: number;
    avgScore: number;
  } {
    const allGaps = Array.from(this.gaps.values());
    const allAssessments = Array.from(this.assessments.values());

    return {
      totalControls: this.controls.size,
      assessedControls: allAssessments.length,
      totalGaps: allGaps.length,
      criticalGaps: allGaps.filter((g) => g.severity === "critical").length,
      avgScore:
        allAssessments.length > 0
          ? Math.round(allAssessments.reduce((sum, a) => sum + a.score, 0) / allAssessments.length)
          : 0,
    };
  }
}

export function createComplianceAnalyzer(scfLoader?: SCFLoader): ComplianceAnalyzer {
  return new ComplianceAnalyzer(scfLoader);
}
