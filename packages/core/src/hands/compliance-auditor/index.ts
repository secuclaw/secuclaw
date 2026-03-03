/**
 * ComplianceAuditor Hand - Implementation
 */

import { BaseHand } from "../base.js";
import type { HandContext } from "../context.js";
import type { HandResult } from "../result.js";
import { createSuccessResult, createErrorResult } from "../result.js";
import { ComplianceAuditorDefinition } from "./definition.js";
import type { Framework, ComplianceCheck, FrameworkResult, GapAnalysis } from "./types.js";

export class ComplianceAuditorHand extends BaseHand {
  private checks: ComplianceCheck[] = [];

  constructor() {
    super(ComplianceAuditorDefinition);
  }

  static getDefinition() { return ComplianceAuditorDefinition; }

  async initialize(): Promise<void> {
    this.reportProgress(0, "Initializing ComplianceAuditor...");
    this.checks = this.loadChecks();
    this.reportProgress(100, "ComplianceAuditor initialized");
  }

  async execute(context: HandContext): Promise<HandResult> {
    const startTime = Date.now();
    const config = context.config as Record<string, unknown>;
    const frameworks = (config["frameworks"] as Framework[]) || ["iso27001"];
    
    try {
      this.reportProgress(10, "Running compliance checks...");
      const results: FrameworkResult[] = [];
      
      for (const framework of frameworks) {
        const result = await this.runAudit(framework);
        results.push(result);
      }
      
      const gaps = this.analyzeGaps(results);
      
      this.reportProgress(100, `Audit complete: ${results.length} frameworks checked`);
      
      return createSuccessResult({ results, gaps }, Date.now() - startTime, {
        compliance_score: this.calculateOverallScore(results),
        issues_found: results.reduce((sum, r) => sum + r.failedControls, 0),
        gaps_count: gaps.reduce((sum, g) => sum + g.gaps.length, 0),
      });
    } catch (error) {
      return createErrorResult({ code: "EXECUTION_ERROR", message: String(error), recoverable: true }, Date.now() - startTime);
    }
  }

  async terminate(): Promise<void> { this.checks = []; }

  private loadChecks(): ComplianceCheck[] {
    return [
      { id: "1", controlId: "A.5.1", title: "Information Security Policies", description: "Policies for information security", status: "pass", severity: "high" },
      { id: "2", controlId: "A.6.1", title: "Organization of Information Security", description: "Internal organization", status: "pass", severity: "high" },
      { id: "3", controlId: "A.7.1", title: "Human Resource Security", description: "Security responsibilities", status: "partial", severity: "medium" },
      { id: "4", controlId: "A.8.1", title: "Asset Management", description: "Responsibility for assets", status: "fail", severity: "critical" },
      { id: "5", controlId: "A.9.1", title: "Access Control", description: "Access control policy", status: "pass", severity: "critical" },
    ];
  }

  private async runAudit(framework: Framework): Promise<FrameworkResult> {
    const passed = this.checks.filter(c => c.status === "pass").length;
    const failed = this.checks.filter(c => c.status === "fail").length;
    return {
      framework,
      score: (passed / this.checks.length) * 100,
      totalControls: this.checks.length,
      passedControls: passed,
      failedControls: failed,
      checks: this.checks,
    };
  }

  private analyzeGaps(results: FrameworkResult[]): GapAnalysis[] {
    return results.filter(r => r.failedControls > 0).map(r => ({
      framework: r.framework,
      gaps: r.checks.filter(c => c.status === "fail").map(c => ({
        controlId: c.controlId,
        title: c.title,
        currentState: "Not implemented",
        requiredState: "Implement control",
        remediationEffort: c.severity === "critical" ? "high" : "medium",
      })),
    }));
  }

  private calculateOverallScore(results: FrameworkResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.score, 0) / results.length;
  }
}

export default ComplianceAuditorHand;
