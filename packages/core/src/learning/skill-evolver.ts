import * as fs from "node:fs";
import * as path from "node:path";
import type { LearningManager } from "../learning/manager.js";

export interface SkillEvolutionConfig {
  skillsDir: string;
  minFeedbackCount: number;
  improvementThreshold: number;
  maxEvolutionHistory: number;
}

export interface EvolutionRecord {
  skillId: string;
  version: number;
  timestamp: number;
  changes: string[];
  feedbackScore: number;
  previousScore: number;
  newScore: number;
}

export class SkillEvolver {
  private config: SkillEvolutionConfig;
  private learningManager: LearningManager;
  private evolutionHistory: Map<string, EvolutionRecord[]> = new Map();

  constructor(config: SkillEvolutionConfig, learningManager: LearningManager) {
    this.config = config;
    this.learningManager = learningManager;
  }

  analyzeSkillPerformance(skillId: string): {
    totalFeedback: number;
    positiveRate: number;
    commonIssues: string[];
    improvementAreas: string[];
  } {
    const performance = this.learningManager.getSkillPerformance(skillId);
    const patterns = this.learningManager.getPatterns(skillId);
    
    const commonIssues: string[] = [];
    const improvementAreas: string[] = [];

    for (const pattern of patterns) {
      if (pattern.successRate < this.config.improvementThreshold) {
        commonIssues.push(`低成功率模式: ${pattern.category}`);
        improvementAreas.push(`需要改进 ${pattern.category} 类型的回答`);
      }
    }

    if (performance.positiveRate < 0.7) {
      improvementAreas.push("整体回复质量需要提升");
    }

    if (performance.recentTrend === "declining") {
      improvementAreas.push("近期表现呈下降趋势，需要重点关注");
    }

    return {
      totalFeedback: performance.totalFeedback,
      positiveRate: performance.positiveRate,
      commonIssues,
      improvementAreas,
    };
  }

  generateImprovementSuggestions(skillId: string): string[] {
    const analysis = this.analyzeSkillPerformance(skillId);
    const suggestions: string[] = [];

    if (analysis.totalFeedback < this.config.minFeedbackCount) {
      return [`需要更多反馈数据 (当前: ${analysis.totalFeedback}, 最小: ${this.config.minFeedbackCount})`];
    }

    for (const area of analysis.improvementAreas) {
      suggestions.push(`建议: ${area}`);
    }

    if (analysis.positiveRate < 0.5) {
      suggestions.push("建议重新审视技能的核心提示词，考虑增加更具体的指导");
    }

    if (analysis.commonIssues.length > 0) {
      suggestions.push(`常见问题: ${analysis.commonIssues.join("; ")}`);
    }

    return suggestions;
  }

  async evolveSkill(skillId: string): Promise<{
    evolved: boolean;
    newVersion: number;
    changes: string[];
  }> {
    const skillPath = path.join(this.config.skillsDir, skillId, "SKILL.md");
    
    if (!fs.existsSync(skillPath)) {
      return { evolved: false, newVersion: 0, changes: ["Skill file not found"] };
    }

    const analysis = this.analyzeSkillPerformance(skillId);
    
    if (analysis.totalFeedback < this.config.minFeedbackCount) {
      return { 
        evolved: false, 
        newVersion: 0, 
        changes: [`Insufficient feedback: ${analysis.totalFeedback}/${this.config.minFeedbackCount}`] 
      };
    }

    if (analysis.positiveRate > 0.8) {
      return { evolved: false, newVersion: 0, changes: ["Skill performing well, no evolution needed"] };
    }

    const suggestions = this.generateImprovementSuggestions(skillId);
    const history = this.evolutionHistory.get(skillId) ?? [];
    const currentVersion = history.length > 0 ? Math.max(...history.map((r) => r.version)) : 1;

    const record: EvolutionRecord = {
      skillId,
      version: currentVersion + 1,
      timestamp: Date.now(),
      changes: suggestions,
      feedbackScore: analysis.positiveRate,
      previousScore: history.length > 0 ? history[history.length - 1].newScore : analysis.positiveRate,
      newScore: analysis.positiveRate,
    };

    history.push(record);
    if (history.length > this.config.maxEvolutionHistory) {
      history.shift();
    }
    this.evolutionHistory.set(skillId, history);

    return {
      evolved: true,
      newVersion: record.version,
      changes: suggestions,
    };
  }

  getEvolutionHistory(skillId: string): EvolutionRecord[] {
    return this.evolutionHistory.get(skillId) ?? [];
  }

  getAllEvolutionStatus(): Array<{
    skillId: string;
    version: number;
    lastEvolution: number;
    performance: ReturnType<SkillEvolver["analyzeSkillPerformance"]>;
  }> {
    const skills = this.listSkills();
    
    return skills.map((skillId) => {
      const history = this.evolutionHistory.get(skillId) ?? [];
      const lastRecord = history[history.length - 1];
      
      return {
        skillId,
        version: lastRecord?.version ?? 1,
        lastEvolution: lastRecord?.timestamp ?? 0,
        performance: this.analyzeSkillPerformance(skillId),
      };
    });
  }

  private listSkills(): string[] {
    if (!fs.existsSync(this.config.skillsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.config.skillsDir)
      .filter((name) => {
        const skillPath = path.join(this.config.skillsDir, name, "SKILL.md");
        return fs.existsSync(skillPath);
      });
  }
}
