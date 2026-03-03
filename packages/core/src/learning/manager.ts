import * as fs from "node:fs";
import * as path from "node:path";
import type {
  FeedbackRecord,
  LearningPattern,
  SkillEvolution,
  LearningConfig,
} from "./types.js";
import { DEFAULT_LEARNING_CONFIG } from "./types.js";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export class LearningManager {
  private config: LearningConfig;
  private feedbackRecords: Map<string, FeedbackRecord> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private skillEvolutions: Map<string, SkillEvolution> = new Map();
  private feedbackFile: string;
  private patternsFile: string;
  private evolutionsFile: string;

  constructor(config: Partial<LearningConfig> & { dataDir: string }) {
    this.config = {
      ...DEFAULT_LEARNING_CONFIG,
      ...config,
    };

    const learningDir = path.join(this.config.dataDir, "learning");
    if (!fs.existsSync(learningDir)) {
      fs.mkdirSync(learningDir, { recursive: true });
    }

    this.feedbackFile = path.join(learningDir, "feedback.jsonl");
    this.patternsFile = path.join(learningDir, "patterns.json");
    this.evolutionsFile = path.join(learningDir, "evolutions.json");

    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.feedbackFile)) {
      const content = fs.readFileSync(this.feedbackFile, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as FeedbackRecord;
          this.feedbackRecords.set(record.id, record);
        } catch {}
      }
    }

    if (fs.existsSync(this.patternsFile)) {
      try {
        const content = fs.readFileSync(this.patternsFile, "utf-8");
        const patterns = JSON.parse(content) as LearningPattern[];
        for (const pattern of patterns) {
          this.patterns.set(pattern.id, pattern);
        }
      } catch {}
    }

    if (fs.existsSync(this.evolutionsFile)) {
      try {
        const content = fs.readFileSync(this.evolutionsFile, "utf-8");
        const evolutions = JSON.parse(content) as SkillEvolution[];
        for (const evolution of evolutions) {
          this.skillEvolutions.set(evolution.skillId, evolution);
        }
      } catch {}
    }
  }

  private saveFeedbackToDisk(): void {
    const lines = Array.from(this.feedbackRecords.values()).map((r) =>
      JSON.stringify(r)
    );
    fs.writeFileSync(this.feedbackFile, lines.join("\n") + "\n", "utf-8");
  }

  private savePatternsToDisk(): void {
    const patterns = Array.from(this.patterns.values());
    fs.writeFileSync(this.patternsFile, JSON.stringify(patterns, null, 2), "utf-8");
  }

  async recordFeedback(
    record: Omit<FeedbackRecord, "id" | "timestamp">
  ): Promise<FeedbackRecord> {
    const feedback: FeedbackRecord = {
      ...record,
      id: generateId(),
      timestamp: Date.now(),
    };

    this.feedbackRecords.set(feedback.id, feedback);
    this.saveFeedbackToDisk();

    await this.updatePatterns(feedback);

    return feedback;
  }

  private async updatePatterns(feedback: FeedbackRecord): Promise<void> {
    const patternKey = `${feedback.skill}:${feedback.taskCategory}`;
    let pattern = this.patterns.get(patternKey);

    if (!pattern) {
      pattern = {
        id: patternKey,
        pattern: feedback.query.substring(0, 100),
        category: feedback.taskCategory,
        successfulResponses: [],
        failedResponses: [],
        successRate: 0,
        lastUpdated: Date.now(),
        suggestedImprovements: [],
      };
      this.patterns.set(patternKey, pattern);
    }

    if (feedback.rating === "positive") {
      pattern.successfulResponses.push(feedback.response);
    } else if (feedback.rating === "negative") {
      pattern.failedResponses.push(feedback.response);
    }

    const total =
      pattern.successfulResponses.length + pattern.failedResponses.length;
    pattern.successRate = total > 0 ? pattern.successfulResponses.length / total : 0;
    pattern.lastUpdated = Date.now();

    if (
      pattern.successRate < this.config.improvementThreshold &&
      pattern.failedResponses.length >= this.config.minFeedbackForPattern
    ) {
      pattern.suggestedImprovements.push(
        `Consider improving responses for ${feedback.taskCategory} queries in ${feedback.skill}`
      );
    }

    this.savePatternsToDisk();
  }

  getFeedback(sessionId?: string, skill?: string): FeedbackRecord[] {
    let records = Array.from(this.feedbackRecords.values());
    if (sessionId) {
      records = records.filter((r) => r.sessionId === sessionId);
    }
    if (skill) {
      records = records.filter((r) => r.skill === skill);
    }
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  getPatterns(skill?: string): LearningPattern[] {
    let patterns = Array.from(this.patterns.values());
    if (skill) {
      patterns = patterns.filter((p) => p.id.startsWith(skill + ":"));
    }
    return patterns.sort((a, b) => b.successRate - a.successRate);
  }

  getSkillEvolution(skillId: string): SkillEvolution | undefined {
    return this.skillEvolutions.get(skillId);
  }

  getSkillPerformance(skillId: string): {
    totalFeedback: number;
    positiveRate: number;
    recentTrend: "improving" | "declining" | "stable";
  } {
    const feedback = this.getFeedback(undefined, skillId);
    const positive = feedback.filter((f) => f.rating === "positive").length;
    const total = feedback.length;

    const recentFeedback = feedback.slice(0, 10);
    const recentPositive = recentFeedback.filter(
      (f) => f.rating === "positive"
    ).length;
    const olderFeedback = feedback.slice(10, 20);
    const olderPositive = olderFeedback.filter(
      (f) => f.rating === "positive"
    ).length;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (recentFeedback.length >= 5 && olderFeedback.length >= 5) {
      const recentRate = recentPositive / recentFeedback.length;
      const olderRate = olderPositive / olderFeedback.length;
      if (recentRate > olderRate + 0.1) {
        trend = "improving";
      } else if (recentRate < olderRate - 0.1) {
        trend = "declining";
      }
    }

    return {
      totalFeedback: total,
      positiveRate: total > 0 ? positive / total : 0,
      recentTrend: trend,
    };
  }

  getLearningStats(): {
    totalFeedback: number;
    totalPatterns: number;
    averageSuccessRate: number;
    skillsTracked: number;
  } {
    const patterns = Array.from(this.patterns.values());
    const skills = new Set(
      Array.from(this.feedbackRecords.values()).map((r) => r.skill)
    );

    return {
      totalFeedback: this.feedbackRecords.size,
      totalPatterns: patterns.length,
      averageSuccessRate:
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length
          : 0,
      skillsTracked: skills.size,
    };
  }
}
