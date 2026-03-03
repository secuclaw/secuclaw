import type {
  QualityAssessment,
  QualityScore,
  QualityIssue,
  QualityLevel,
  QualityConfig,
  ContentType,
  HallucinationIndicator,
  ValidationContext,
} from "./types.js";
import {
  DEFAULT_QUALITY_CONFIG,
  QUALITY_LEVEL_THRESHOLDS,
  HALLUCINATION_PATTERNS,
} from "./types.js";
import { getRulesForContentType, ALL_RULES } from "./validators.js";

export class QualityAssuranceEngine {
  private config: QualityConfig;
  private assessments: Map<string, QualityAssessment> = new Map();
  private customRules: Map<string, (content: string, context?: ValidationContext) => { score: number; issues: QualityIssue[] }> = new Map();

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
  }

  assess(
    content: string,
    contentType: ContentType = "general",
    context?: ValidationContext
  ): QualityAssessment {
    const id = `qa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const rules = getRulesForContentType(contentType);
    const dimensionScores: QualityScore[] = [];
    const allIssues: QualityIssue[] = [];

    const dimensionResults = new Map<string, { totalScore: number; totalWeight: number }>();

    for (const rule of rules) {
      const result = rule.validator(content, { ...context, contentType });

      const dim = dimensionResults.get(rule.dimension) || { totalScore: 0, totalWeight: 0 };
      dim.totalScore += result.score * rule.weight;
      dim.totalWeight += rule.weight;
      dimensionResults.set(rule.dimension, dim);

      allIssues.push(...result.issues);
    }

    for (const [dimension, data] of dimensionResults) {
      const avgScore = data.totalWeight > 0 ? data.totalScore / data.totalWeight : 0;
      const weight = this.config.dimensionWeights[dimension as keyof typeof this.config.dimensionWeights] || 0.1;

      dimensionScores.push({
        dimension: dimension as QualityScore["dimension"],
        score: Math.round(avgScore * 100) / 100,
        weight,
        reasoning: this.getDimensionReasoning(dimension, avgScore),
      });
    }

    const missingDimensions = Object.keys(this.config.dimensionWeights).filter(
      (d) => !dimensionResults.has(d)
    );

    for (const dim of missingDimensions) {
      const weight = this.config.dimensionWeights[dim as keyof typeof this.config.dimensionWeights];
      dimensionScores.push({
        dimension: dim as QualityScore["dimension"],
        score: 0.5,
        weight,
        reasoning: "未检查该维度",
      });
    }

    let overallScore = 0;
    let totalWeight = 0;
    for (const ds of dimensionScores) {
      overallScore += ds.score * ds.weight;
      totalWeight += ds.weight;
    }
    overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;
    overallScore = Math.round(overallScore * 100) / 100;

    const level = this.determineQualityLevel(overallScore);

    const recommendations = this.generateRecommendations(dimensionScores, allIssues);

    const passed = overallScore >= this.config.minimumScore;

    const assessment: QualityAssessment = {
      id,
      timestamp: Date.now(),
      content: content.substring(0, 500),
      contentType,
      overallScore,
      level,
      dimensionScores,
      issues: allIssues,
      recommendations,
      passed,
      metadata: {
        contentLength: content.length,
        rulesApplied: rules.length,
        dimensionCount: dimensionScores.length,
      },
    };

    this.assessments.set(id, assessment);

    return assessment;
  }

  private determineQualityLevel(score: number): QualityLevel {
    for (const [level, [min, max]] of Object.entries(QUALITY_LEVEL_THRESHOLDS)) {
      if (score >= min && score <= max) {
        return level as QualityLevel;
      }
    }
    return "unacceptable";
  }

  private getDimensionReasoning(dimension: string, score: number): string {
    const descriptions: Record<string, Record<string, string>> = {
      accuracy: {
        high: "事实准确，无明显错误",
        medium: "存在一些事实性问题",
        low: "存在明显的事实错误",
      },
      relevance: {
        high: "内容高度相关",
        medium: "内容部分相关",
        low: "内容相关性较低",
      },
      coherence: {
        high: "逻辑清晰，结构良好",
        medium: "逻辑基本清晰",
        low: "逻辑混乱",
      },
      safety: {
        high: "内容安全无风险",
        medium: "存在轻微安全风险",
        low: "存在安全风险",
      },
      completeness: {
        high: "内容完整全面",
        medium: "内容基本完整",
        low: "内容不完整",
      },
      conciseness: {
        high: "内容简洁精炼",
        medium: "内容可进一步精简",
        low: "内容冗余较多",
      },
    };

    const level = score >= 0.8 ? "high" : score >= 0.5 ? "medium" : "low";
    return descriptions[dimension]?.[level] || "评估完成";
  }

  private generateRecommendations(
    scores: QualityScore[],
    issues: QualityIssue[]
  ): string[] {
    const recommendations: string[] = [];

    const lowScores = scores.filter((s) => s.score < 0.6);
    for (const score of lowScores) {
      switch (score.dimension) {
        case "accuracy":
          recommendations.push("建议验证关键事实和数据准确性");
          break;
        case "relevance":
          recommendations.push("建议增加与主题相关的内容");
          break;
        case "coherence":
          recommendations.push("建议优化内容结构和逻辑流程");
          break;
        case "safety":
          recommendations.push("建议移除或脱敏敏感内容");
          break;
        case "completeness":
          recommendations.push("建议补充缺失的关键信息");
          break;
        case "conciseness":
          recommendations.push("建议精简冗余内容");
          break;
      }
    }

    const errorCount = issues.filter((i) => i.type === "error").length;
    if (errorCount > 0) {
      recommendations.push(`发现${errorCount}个严重问题需要修复`);
    }

    if (recommendations.length === 0) {
      recommendations.push("内容质量良好，无需改进");
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  detectHallucinations(content: string): HallucinationIndicator[] {
    if (!this.config.enableHallucinationDetection) {
      return [];
    }

    const indicators: HallucinationIndicator[] = [];

    for (const pattern of HALLUCINATION_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        indicators.push({
          type: pattern.type,
          confidence: 0.6,
          description: pattern.description,
          evidence: matches.slice(0, 3).join(", "),
        });
      }
    }

    const certaintyWords = ["肯定", "一定", "绝对", "必然", "必定", "always", "never", "definitely"];
    const hasHighCertainty = certaintyWords.some((word) =>
      content.toLowerCase().includes(word)
    );
    if (hasHighCertainty) {
      indicators.push({
        type: "logical",
        confidence: 0.4,
        description: "使用高确定性词汇，可能过度自信",
        evidence: "检测到绝对性表述",
      });
    }

    return indicators;
  }

  addCustomRule(
    id: string,
    validator: (content: string, context?: ValidationContext) => { score: number; issues: QualityIssue[] }
  ): void {
    this.customRules.set(id, validator);
  }

  getAssessment(id: string): QualityAssessment | undefined {
    return this.assessments.get(id);
  }

  getRecentAssessments(limit = 10): QualityAssessment[] {
    return Array.from(this.assessments.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getStatistics(): {
    totalAssessments: number;
    passRate: number;
    avgScore: number;
    levelDistribution: Record<QualityLevel, number>;
    topIssues: Array<{ description: string; count: number }>;
  } {
    const all = Array.from(this.assessments.values());
    const totalAssessments = all.length;

    if (totalAssessments === 0) {
      return {
        totalAssessments: 0,
        passRate: 0,
        avgScore: 0,
        levelDistribution: {
          excellent: 0,
          good: 0,
          acceptable: 0,
          poor: 0,
          unacceptable: 0,
        },
        topIssues: [],
      };
    }

    const passRate = all.filter((a) => a.passed).length / totalAssessments;
    const avgScore = all.reduce((sum, a) => sum + a.overallScore, 0) / totalAssessments;

    const levelDistribution: Record<QualityLevel, number> = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
      unacceptable: 0,
    };
    for (const a of all) {
      levelDistribution[a.level]++;
    }

    const issueCounts = new Map<string, number>();
    for (const a of all) {
      for (const issue of a.issues) {
        const key = issue.description;
        issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
      }
    }

    const topIssues = Array.from(issueCounts.entries())
      .map(([description, count]) => ({ description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalAssessments, passRate, avgScore, levelDistribution, topIssues };
  }

  validate(content: string, contentType?: ContentType): boolean {
    const assessment = this.assess(content, contentType);
    return assessment.passed;
  }

  setMinimumScore(score: number): void {
    this.config.minimumScore = score;
  }

  getConfig(): QualityConfig {
    return { ...this.config };
  }
}

export function createQualityEngine(config?: Partial<QualityConfig>): QualityAssuranceEngine {
  return new QualityAssuranceEngine(config);
}
