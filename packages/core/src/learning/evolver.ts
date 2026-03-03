import type { Skill } from "../skills/types.js";

export interface EvolutionContext {
  sessionId: string;
  agentId: string;
  task: string;
  result: string;
  success: boolean;
  feedback?: string;
  metrics?: {
    executionTime: number;
    tokenUsage?: number;
    toolCalls?: number;
  };
}

export interface EvolutionResult {
  evolved: boolean;
  newCapabilities: string[];
  improvements: string[];
  generatedSkill?: Skill;
}

export interface LearningEntry {
  id: string;
  timestamp: Date;
  context: EvolutionContext;
  patterns: string[];
  insights: string[];
  suggestedActions: string[];
}

export interface CapabilityGap {
  id: string;
  description: string;
  frequency: number;
  impact: "high" | "medium" | "low";
  suggestedSolution: string;
}

export class CapabilityEvolver {
  private learningHistory: LearningEntry[] = [];
  private capabilityGaps: Map<string, CapabilityGap> = new Map();
  private maxHistory = 1000;

  async analyze(context: EvolutionContext): Promise<LearningEntry> {
    const patterns = this.extractPatterns(context);
    const insights = this.generateInsights(context, patterns);
    const suggestedActions = this.suggestActions(insights);

    const entry: LearningEntry = {
      id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      context,
      patterns,
      insights,
      suggestedActions,
    };

    this.learningHistory.push(entry);
    if (this.learningHistory.length > this.maxHistory) {
      this.learningHistory.shift();
    }

    this.updateCapabilityGaps(entry);
    return entry;
  }

  async evolve(context: EvolutionContext): Promise<EvolutionResult> {
    const entry = await this.analyze(context);
    
    if (!context.success) {
      return this.handleFailure(context, entry);
    }

    return this.handleSuccess(context, entry);
  }

  private handleFailure(context: EvolutionContext, entry: LearningEntry): EvolutionResult {
    const improvements: string[] = [];
    const newCapabilities: string[] = [];

    if (entry.insights.some(i => i.includes("missing tool"))) {
      improvements.push("Consider adding missing tool capability");
      newCapabilities.push("tool-request");
    }

    if (entry.insights.some(i => i.includes("insufficient knowledge"))) {
      improvements.push("Expand knowledge base coverage");
      newCapabilities.push("knowledge-expansion");
    }

    return {
      evolved: improvements.length > 0,
      newCapabilities,
      improvements,
    };
  }

  private handleSuccess(context: EvolutionContext, entry: LearningEntry): EvolutionResult {
    const improvements: string[] = [];
    const newCapabilities: string[] = [];

    if (context.metrics && context.metrics.executionTime > 10000) {
      improvements.push("Optimize execution time - consider caching or parallel processing");
    }

    if (entry.patterns.length > 3 && !this.hasSkillForPatterns(entry.patterns)) {
      const skill = this.generateSkillFromPatterns(entry);
      return {
        evolved: true,
        newCapabilities: [skill.name],
        improvements: [`Generated new skill: ${skill.name}`],
        generatedSkill: skill,
      };
    }

    return {
      evolved: improvements.length > 0,
      newCapabilities,
      improvements,
    };
  }

  private extractPatterns(context: EvolutionContext): string[] {
    const patterns: string[] = [];
    const task = context.task.toLowerCase();
    const result = context.result.toLowerCase();

    if (task.includes("scan") || task.includes("analyze")) {
      patterns.push("analysis-task");
    }
    if (task.includes("threat") || result.includes("malicious")) {
      patterns.push("threat-detection");
    }
    if (task.includes("compliance") || task.includes("audit")) {
      patterns.push("compliance-check");
    }
    if (result.includes("error") || result.includes("failed")) {
      patterns.push("error-handling");
    }
    if (context.metrics?.toolCalls && context.metrics.toolCalls > 3) {
      patterns.push("multi-tool-workflow");
    }

    return patterns;
  }

  private generateInsights(context: EvolutionContext, patterns: string[]): string[] {
    const insights: string[] = [];

    if (!context.success) {
      insights.push("Task execution failed - review error handling");
      if (patterns.includes("error-handling")) {
        insights.push("Multiple errors detected - may need robust error recovery");
      }
    }

    if (patterns.includes("analysis-task") && patterns.includes("threat-detection")) {
      insights.push("Recurring threat analysis pattern - consider dedicated skill");
    }

    if (patterns.includes("multi-tool-workflow")) {
      insights.push("Complex multi-tool workflow - optimize orchestration");
    }

    if (context.metrics?.executionTime && context.metrics.executionTime > 5000) {
      insights.push("Slow execution - consider performance optimization");
    }

    return insights;
  }

  private suggestActions(insights: string[]): string[] {
    return insights.map(insight => {
      if (insight.includes("dedicated skill")) {
        return "Create specialized skill for recurring pattern";
      }
      if (insight.includes("performance")) {
        return "Add caching or parallel execution";
      }
      if (insight.includes("error")) {
        return "Implement retry logic or fallback strategies";
      }
      return "Review and improve workflow";
    });
  }

  private updateCapabilityGaps(entry: LearningEntry): void {
    for (const insight of entry.insights) {
      const existing = Array.from(this.capabilityGaps.values()).find(
        g => insight.includes(g.description.toLowerCase())
      );

      if (existing) {
        existing.frequency++;
      } else if (insight.includes("missing") || insight.includes("need")) {
        const gap: CapabilityGap = {
          id: `gap_${Date.now()}`,
          description: insight,
          frequency: 1,
          impact: insight.includes("critical") ? "high" : "medium",
          suggestedSolution: entry.suggestedActions[0] ?? "Investigate and implement",
        };
        this.capabilityGaps.set(gap.id, gap);
      }
    }
  }

  private hasSkillForPatterns(patterns: string[]): boolean {
    return patterns.some(p => 
      ["threat-detection", "compliance-check", "analysis-task"].includes(p)
    );
  }

  private generateSkillFromPatterns(entry: LearningEntry): Skill {
    const skillName = entry.patterns
      .map(p => p.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(""))
      .join("_");

    return {
      name: skillName,
      description: `Auto-generated skill for pattern: ${entry.patterns.join(", ")}`,
      data: {
        patterns: entry.patterns,
        context: entry.context,
        suggestedActions: entry.suggestedActions,
      },
      content: {
        frontmatter: { version: "1.0.0-auto" },
        body: `# ${skillName}\n\nAuto-generated from learning pattern.\n\n## Triggers\n${entry.patterns.map(p => `- ${p}`).join("\n")}\n\n## Context\nTask: ${entry.context.task}\n\n## Actions\n${entry.suggestedActions.map(a => `- ${a}`).join("\n")}`,
      },
      filePath: `generated/${skillName}.md`,
      baseDir: "generated",
    };
  }

  getCapabilityGaps(): CapabilityGap[] {
    return Array.from(this.capabilityGaps.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  getLearningHistory(limit = 100): LearningEntry[] {
    return this.learningHistory.slice(-limit);
  }

  async generateSkillForGap(gapId: string): Promise<Skill | undefined> {
    const gap = this.capabilityGaps.get(gapId);
    if (!gap) return undefined;

    const skillName = gap.description.split(" ").slice(0, 3).join(" ");
    
    return {
      name: skillName,
      description: gap.description,
      data: {
        gapId: gap.id,
        impact: gap.impact,
        frequency: gap.frequency,
      },
      content: {
        frontmatter: { version: "1.0.0-gap" },
        body: `# Gap Skill\n\n## Problem\n${gap.description}\n\n## Solution\n${gap.suggestedSolution}\n\n## Frequency\n${gap.frequency} occurrences`,
      },
      filePath: `generated/${skillName.replace(/ /g, "_")}.md`,
      baseDir: "generated",
    };
  }
}

let evolverInstance: CapabilityEvolver | null = null;

export function getCapabilityEvolver(): CapabilityEvolver {
  if (!evolverInstance) {
    evolverInstance = new CapabilityEvolver();
  }
  return evolverInstance;
}

export function resetCapabilityEvolver(): void {
  evolverInstance = null;
}
