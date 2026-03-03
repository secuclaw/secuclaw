import type {
  ComplianceFramework,
  ComplianceControl,
  ControlAssessment,
  ControlStatus,
  GapAnalysisResult,
  ComplianceSummary,
  ComplianceGap,
  GapSeverity,
  PrioritizedRecommendation,
  ComplianceReport,
  ExecutiveSummary,
  RemediationPlan,
  Finding,
  Evidence,
  ControlCategory,
  CategorySummary,
  DomainSummary,
} from './gap-analysis.js';
import { SCF_DOMAINS, CONTROL_CATEGORIES } from './gap-analysis.js';

export interface FrameworkControlsProvider {
  getControls(framework: ComplianceFramework): Promise<ComplianceControl[]>;
  getControl(controlId: string): Promise<ComplianceControl | undefined>;
}

export class ComplianceGapAnalyzer {
  private controls: Map<string, ComplianceControl> = new Map();
  private assessments: Map<string, ControlAssessment> = new Map();
  private previousResults: GapAnalysisResult[] = [];

  constructor(controlsProvider?: FrameworkControlsProvider) {
    this.initializeDefaultControls();
  }

  private initializeDefaultControls(): void {
    const defaultControls: ComplianceControl[] = [
      {
        id: 'scf-gov-01',
        framework: 'scf-2025',
        domain: 'GOV',
        code: 'GOV-01',
        title: 'Cybersecurity Governance Program',
        description: 'Establish and maintain a cybersecurity governance program',
        category: 'governance',
        requirements: [
          'Define cybersecurity roles and responsibilities',
          'Establish governance committee',
          'Document cybersecurity policies',
          'Review governance annually',
        ],
        relatedControls: ['GOV-02', 'RSK-01'],
        mitreMapping: [],
        riskWeight: 1.0,
        evidenceRequired: ['Policy documents', 'Committee meeting minutes', 'Org charts'],
      },
      {
        id: 'scf-iam-01',
        framework: 'scf-2025',
        domain: 'IAM',
        code: 'IAM-01',
        title: 'Identity and Access Management',
        description: 'Implement identity and access management controls',
        category: 'identity-access',
        requirements: [
          'Implement least privilege',
          'Require MFA for privileged access',
          'Regular access reviews',
          'Document access policies',
        ],
        relatedControls: ['IAM-02', 'IAM-03'],
        mitreMapping: ['T1078', 'T1098', 'T1110'],
        riskWeight: 1.0,
        evidenceRequired: ['Access policy', 'MFA configuration', 'Access review records'],
      },
      {
        id: 'scf-net-01',
        framework: 'scf-2025',
        domain: 'NET',
        code: 'NET-01',
        title: 'Network Security Controls',
        description: 'Implement network security controls and segmentation',
        category: 'network-security',
        requirements: [
          'Network segmentation',
          'Firewall rules review',
          'Intrusion detection/prevention',
          'Network monitoring',
        ],
        relatedControls: ['NET-02', 'MON-01'],
        mitreMapping: ['T1043', 'T1071', 'T1090', 'T1571'],
        riskWeight: 1.0,
        evidenceRequired: ['Network diagrams', 'Firewall rules', 'IDS/IPS logs'],
      },
      {
        id: 'scf-vpm-01',
        framework: 'scf-2025',
        domain: 'VPM',
        code: 'VPM-01',
        title: 'Vulnerability Management',
        description: 'Establish vulnerability management program',
        category: 'risk-management',
        requirements: [
          'Regular vulnerability scanning',
          'Risk-based prioritization',
          'Patch management process',
          'SLA for remediation',
        ],
        relatedControls: ['VPM-02', 'THM-01'],
        mitreMapping: ['T1190', 'T1203'],
        riskWeight: 1.0,
        evidenceRequired: ['Scan reports', 'Patch records', 'Remediation SLAs'],
      },
      {
        id: 'scf-ir-01',
        framework: 'scf-2025',
        domain: 'IR',
        code: 'IR-01',
        title: 'Incident Response Program',
        description: 'Establish incident response program',
        category: 'incident-response',
        requirements: [
          'Incident response plan',
          'Response team defined',
          'Communication procedures',
          'Post-incident reviews',
        ],
        relatedControls: ['IR-02', 'OPS-01'],
        mitreMapping: ['T1059', 'T1566', 'T1078'],
        riskWeight: 1.0,
        evidenceRequired: ['IR plan', 'Team roster', 'Incident records', 'Post-mortem reports'],
      },
      {
        id: 'scf-dch-01',
        framework: 'scf-2025',
        domain: 'DCH',
        code: 'DCH-01',
        title: 'Data Classification and Handling',
        description: 'Implement data classification and handling procedures',
        category: 'data-protection',
        requirements: [
          'Data classification scheme',
          'Handling procedures by classification',
          'Data retention policy',
          'Data disposal procedures',
        ],
        relatedControls: ['DCH-02', 'PRV-01', 'CRY-01'],
        mitreMapping: ['T1530', 'T1074'],
        riskWeight: 0.9,
        evidenceRequired: ['Classification policy', 'Handling procedures', 'Retention policy'],
      },
      {
        id: 'scf-cld-01',
        framework: 'scf-2025',
        domain: 'CLD',
        code: 'CLD-01',
        title: 'Cloud Security',
        description: 'Implement cloud security controls',
        category: 'network-security',
        requirements: [
          'Cloud security architecture',
          'Cloud access controls',
          'Cloud monitoring',
          'Cloud compliance',
        ],
        relatedControls: ['CLD-02', 'IAM-04'],
        mitreMapping: ['T1078', 'T1535', 'T1552', 'T1098'],
        riskWeight: 1.0,
        evidenceRequired: ['Cloud architecture', 'Access configurations', 'Monitoring logs'],
      },
      {
        id: 'scf-tpm-01',
        framework: 'scf-2025',
        domain: 'TPM',
        code: 'TPM-01',
        title: 'Third-Party Risk Management',
        description: 'Manage third-party security risks',
        category: 'third-party',
        requirements: [
          'Vendor assessment process',
          'Security requirements in contracts',
          'Vendor monitoring',
          'Incident notification from vendors',
        ],
        relatedControls: ['TPM-02', 'RSK-03'],
        mitreMapping: ['T1195', 'T1199'],
        riskWeight: 0.8,
        evidenceRequired: ['Vendor assessments', 'Contracts', 'Monitoring reports'],
      },
    ];

    for (const control of defaultControls) {
      this.controls.set(control.id, control);
    }
  }

  registerControl(control: ComplianceControl): void {
    this.controls.set(control.id, control);
  }

  assessControl(
    controlId: string,
    status: ControlStatus,
    evidence: Evidence[] = [],
    findings: Finding[] = [],
    assessedBy: string = 'system'
  ): ControlAssessment {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const score = this.calculateScore(status, findings);

    const assessment: ControlAssessment = {
      controlId,
      status,
      score,
      assessedAt: new Date(),
      assessedBy,
      evidence,
      findings,
      remediation: status !== 'compliant' && status !== 'not-applicable'
        ? this.generateRemediation(control, findings)
        : undefined,
    };

    this.assessments.set(controlId, assessment);
    return assessment;
  }

  async analyzeGaps(
    framework: ComplianceFramework,
    scope: string[] = []
  ): Promise<GapAnalysisResult> {
    const relevantControls = Array.from(this.controls.values())
      .filter(c => c.framework === framework)
      .filter(c => scope.length === 0 || scope.includes(c.domain));

    const assessments = relevantControls
      .map(c => this.assessments.get(c.id))
      .filter((a): a is ControlAssessment => a !== undefined);

    const summary = this.calculateSummary(relevantControls, assessments);
    const gaps = this.identifyGaps(relevantControls, assessments);
    const riskScore = this.calculateRiskScore(gaps);
    const maturityLevel = this.calculateMaturityLevel(summary);
    const recommendations = this.prioritizeRecommendations(gaps, relevantControls);

    const result: GapAnalysisResult = {
      id: `analysis-${Date.now()}`,
      framework,
      assessedAt: new Date(),
      scope: scope.length > 0 ? scope : Object.keys(SCF_DOMAINS),
      summary,
      controls: assessments,
      gaps,
      riskScore,
      maturityLevel,
      recommendations,
    };

    this.previousResults.push(result);
    return result;
  }

  generateReport(analysis: GapAnalysisResult): ComplianceReport {
    const topGaps = analysis.gaps
      .sort((a, b) => this.severityToNumber(b.severity) - this.severityToNumber(a.severity))
      .slice(0, 5);

    const quickWins = analysis.recommendations.filter(r => r.quickWin).slice(0, 5);

    const riskLevel = this.calculateRiskLevel(analysis.riskScore);

    const executive: ExecutiveSummary = {
      overallScore: analysis.summary.complianceScore,
      maturityLevel: this.getMaturityLabel(analysis.maturityLevel),
      riskLevel,
      keyFindings: [
        `${analysis.summary.compliant} of ${analysis.summary.assessed} controls are compliant (${Math.round(analysis.summary.complianceScore)}%)`,
        `${analysis.gaps.filter(g => g.severity === 'critical').length} critical gaps identified`,
        `Top risk area: ${this.getTopRiskCategory(analysis.gaps)}`,
      ],
      topGaps,
      quickWins,
      nextSteps: [
        'Address critical gaps immediately',
        'Implement quick wins to improve posture',
        'Schedule regular reassessment',
      ],
    };

    return {
      id: `report-${Date.now()}`,
      analysisId: analysis.id,
      generatedAt: new Date(),
      executive,
      details: analysis,
      trendComparison: this.calculateTrend(analysis),
    };
  }

  private calculateScore(status: ControlStatus, findings: Finding[]): number {
    const baseScores: Record<ControlStatus, number> = {
      'compliant': 100,
      'partial': 50,
      'non-compliant': 0,
      'not-applicable': 100,
      'not-assessed': 0,
    };

    let score = baseScores[status];

    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;

    score -= criticalFindings * 20;
    score -= highFindings * 10;

    return Math.max(0, Math.min(100, score));
  }

  private calculateSummary(
    controls: ComplianceControl[],
    assessments: ControlAssessment[]
  ): ComplianceSummary {
    const byStatus = {
      totalControls: controls.length,
      assessed: assessments.length,
      compliant: assessments.filter(a => a.status === 'compliant').length,
      partial: assessments.filter(a => a.status === 'partial').length,
      nonCompliant: assessments.filter(a => a.status === 'non-compliant').length,
      notApplicable: assessments.filter(a => a.status === 'not-applicable').length,
      complianceScore: 0,
      byCategory: {} as Record<ControlCategory, CategorySummary>,
      byDomain: {} as Record<string, DomainSummary>,
    };

    if (assessments.length > 0) {
      const relevantAssessments = assessments.filter(a => a.status !== 'not-applicable');
      byStatus.complianceScore = relevantAssessments.reduce((sum, a) => sum + a.score, 0) / relevantAssessments.length;
    }

    for (const category of CONTROL_CATEGORIES) {
      const categoryControls = controls.filter(c => c.category === category);
      const categoryAssessments = assessments.filter(a =>
        categoryControls.some(c => c.id === a.controlId)
      );

      byStatus.byCategory[category] = {
        total: categoryControls.length,
        compliant: categoryAssessments.filter(a => a.status === 'compliant').length,
        partial: categoryAssessments.filter(a => a.status === 'partial').length,
        nonCompliant: categoryAssessments.filter(a => a.status === 'non-compliant').length,
        score: categoryAssessments.length > 0
          ? categoryAssessments.reduce((sum, a) => sum + a.score, 0) / categoryAssessments.length
          : 0,
      };
    }

    const domains = new Set(controls.map(c => c.domain));
    for (const domain of domains) {
      const domainControls = controls.filter(c => c.domain === domain);
      const domainAssessments = assessments.filter(a =>
        domainControls.some(c => c.id === a.controlId)
      );

      byStatus.byDomain[domain] = {
        domain,
        total: domainControls.length,
        compliant: domainAssessments.filter(a => a.status === 'compliant').length,
        score: domainAssessments.length > 0
          ? domainAssessments.reduce((sum, a) => sum + a.score, 0) / domainAssessments.length
          : 0,
        criticalGaps: domainAssessments.filter(a => 
          a.status === 'non-compliant' && a.findings.some(f => f.severity === 'critical')
        ).length,
      };
    }

    return byStatus;
  }

  private identifyGaps(
    controls: ComplianceControl[],
    assessments: ControlAssessment[]
  ): ComplianceGap[] {
    const gaps: ComplianceGap[] = [];

    for (const control of controls) {
      const assessment = assessments.find(a => a.controlId === control.id);
      
      if (!assessment || assessment.status === 'not-assessed') {
        gaps.push(this.createGap(control, 'high', 'Control not assessed'));
        continue;
      }

      if (assessment.status === 'non-compliant' || assessment.status === 'partial') {
        const severity = this.determineSeverity(assessment);
        gaps.push(this.createGap(
          control,
          severity,
          assessment.findings.length > 0
            ? assessment.findings.map(f => f.description).join('; ')
            : `Control is ${assessment.status}`
        ));
      }
    }

    return gaps.sort((a, b) => this.severityToNumber(b.severity) - this.severityToNumber(a.severity));
  }

  private createGap(
    control: ComplianceControl,
    severity: GapSeverity,
    description: string
  ): ComplianceGap {
    return {
      id: `gap-${control.id}`,
      controlId: control.id,
      controlTitle: control.title,
      severity,
      category: control.category,
      gap: description,
      impact: this.calculateImpact(severity, control),
      riskScore: control.riskWeight * this.severityToNumber(severity) * 25,
      remediation: this.generateRemediation(control, []),
      mitreExposure: control.mitreMapping || [],
    };
  }

  private determineSeverity(assessment: ControlAssessment): GapSeverity {
    if (assessment.status === 'non-compliant') {
      if (assessment.findings.some(f => f.severity === 'critical')) return 'critical';
      if (assessment.findings.some(f => f.severity === 'high')) return 'high';
      return 'high';
    }
    
    if (assessment.status === 'partial') {
      if (assessment.findings.some(f => f.severity === 'critical')) return 'high';
      if (assessment.findings.some(f => f.severity === 'high')) return 'medium';
      return 'medium';
    }

    return 'low';
  }

  private generateRemediation(control: ComplianceControl, _findings: Finding[]): RemediationPlan {
    const steps = control.requirements.map((req, idx) => ({
      order: idx + 1,
      action: `Implement: ${req}`,
      completed: false,
    }));

    return {
      id: `remediation-${control.id}`,
      controlId: control.id,
      priority: 'high',
      title: `Remediate ${control.title}`,
      description: `Address gaps in ${control.title} control`,
      steps,
      estimatedEffort: this.estimateEffort(control),
      status: 'planned',
    };
  }

  private estimateEffort(control: ComplianceControl): string {
    const reqCount = control.requirements.length;
    if (reqCount <= 2) return '1-2 weeks';
    if (reqCount <= 4) return '2-4 weeks';
    return '1-2 months';
  }

  private calculateRiskScore(gaps: ComplianceGap[]): number {
    if (gaps.length === 0) return 0;

    const severityWeights: Record<GapSeverity, number> = {
      'critical': 40,
      'high': 25,
      'medium': 15,
      'low': 5,
    };

    return Math.min(100, gaps.reduce((sum, gap) => sum + severityWeights[gap.severity], 0));
  }

  private calculateMaturityLevel(summary: ComplianceSummary): number {
    const score = summary.complianceScore;
    
    if (score >= 95) return 5;
    if (score >= 80) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
  }

  private prioritizeRecommendations(
    gaps: ComplianceGap[],
    controls: ComplianceControl[]
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];

    for (const gap of gaps) {
      const control = controls.find(c => c.id === gap.controlId);
      if (!control) continue;

      recommendations.push({
        id: `rec-${gap.id}`,
        priority: this.severityToNumber(gap.severity),
        title: `Address ${gap.controlTitle}`,
        description: gap.gap,
        affectedControls: [gap.controlId],
        estimatedEffort: this.getEffortLevel(gap),
        riskReduction: gap.riskScore,
        quickWin: gap.severity !== 'critical' && control.requirements.length <= 2,
      });
    }

    return recommendations
      .sort((a, b) => b.priority - a.priority || b.riskReduction - a.riskReduction)
      .slice(0, 10);
  }

  private getEffortLevel(gap: ComplianceGap): 'low' | 'medium' | 'high' {
    if (gap.severity === 'critical') return 'high';
    if (gap.severity === 'high') return 'medium';
    return 'low';
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private getMaturityLabel(level: number): string {
    const labels = ['Initial', 'Developing', 'Defined', 'Managed', 'Optimized'];
    return labels[Math.max(0, Math.min(level - 1, 4))];
  }

  private getTopRiskCategory(gaps: ComplianceGap[]): string {
    const categoryCount: Record<string, number> = {};
    
    for (const gap of gaps) {
      if (gap.severity === 'critical' || gap.severity === 'high') {
        categoryCount[gap.category] = (categoryCount[gap.category] || 0) + 1;
      }
    }

    const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }

  private calculateTrend(current: GapAnalysisResult): { previousScore: number; currentScore: number; change: number; improved: string[]; declined: string[]; period: string } | undefined {
    if (this.previousResults.length < 2) return undefined;

    const previous = this.previousResults[this.previousResults.length - 2];
    
    const improved: string[] = [];
    const declined: string[] = [];

    for (const control of current.controls) {
      const prevControl = previous.controls.find(c => c.controlId === control.controlId);
      if (prevControl) {
        if (control.score > prevControl.score) {
          improved.push(control.controlId);
        } else if (control.score < prevControl.score) {
          declined.push(control.controlId);
        }
      }
    }

    return {
      previousScore: previous.summary.complianceScore,
      currentScore: current.summary.complianceScore,
      change: current.summary.complianceScore - previous.summary.complianceScore,
      improved,
      declined,
      period: '30 days',
    };
  }

  private severityToNumber(severity: GapSeverity): number {
    return { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }[severity];
  }

  private calculateImpact(severity: GapSeverity, control: ComplianceControl): string {
    const mitreExposure = control.mitreMapping?.length || 0;
    
    if (severity === 'critical') {
      return `Critical gap exposing organization to high-risk attack vectors${mitreExposure > 0 ? ` (MITRE: ${control.mitreMapping?.join(', ')})` : ''}`;
    }
    if (severity === 'high') {
      return `Significant gap in security posture${mitreExposure > 0 ? ` with potential MITRE exposure` : ''}`;
    }
    return `Moderate gap affecting compliance posture`;
  }

  getControl(controlId: string): ComplianceControl | undefined {
    return this.controls.get(controlId);
  }

  listControls(framework?: ComplianceFramework): ComplianceControl[] {
    const all = Array.from(this.controls.values());
    return framework ? all.filter(c => c.framework === framework) : all;
  }

  getAssessment(controlId: string): ControlAssessment | undefined {
    return this.assessments.get(controlId);
  }

  getPreviousAnalyses(): GapAnalysisResult[] {
    return this.previousResults;
  }
}

export function createComplianceGapAnalyzer(): ComplianceGapAnalyzer {
  return new ComplianceGapAnalyzer();
}
