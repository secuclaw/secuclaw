import * as fs from "node:fs";
import * as path from "node:path";
import { emitEvent } from "../events/stream.js";
import { auditLog } from "../audit/logger.js";

export interface SkillEvolution {
  id: string;
  skillName: string;
  version: string;
  changes: SkillChange[];
  performance: PerformanceMetrics;
  status: "draft" | "testing" | "approved" | "deployed" | "rejected";
  createdAt: Date;
  createdBy: "agent" | "human";
}

export interface SkillChange {
  type: "add" | "modify" | "remove" | "optimize";
  section: "prompt" | "example" | "trigger" | "metadata";
  description: string;
  before?: string;
  after?: string;
  reason: string;
}

export interface PerformanceMetrics {
  successRate: number;
  avgResponseTime: number;
  userSatisfaction: number;
  errorRate: number;
  usageCount: number;
}

export interface ImprovementSuggestion {
  id: string;
  skillName: string;
  type: "prompt" | "example" | "trigger" | "metadata";
  priority: "high" | "medium" | "low";
  description: string;
  suggestedChange: string;
  reason: string;
  basedOn: string[];
}

export interface EvolutionStats {
  totalEvolutions: number;
  approvedChanges: number;
  rejectedChanges: number;
  avgPerformanceGain: number;
  topPerformers: string[];
  needsImprovement: string[];
}

class SkillEvolver {
  private evolutions: Map<string, SkillEvolution> = new Map();
  private suggestions: Map<string, ImprovementSuggestion> = new Map();
  private skillsDir: string;
  private evolutionDir: string;
  private stats: EvolutionStats = {
    totalEvolutions: 0,
    approvedChanges: 0,
    rejectedChanges: 0,
    avgPerformanceGain: 0,
    topPerformers: [],
    needsImprovement: [],
  };

  constructor(dataDir: string, skillsDir: string) {
    this.skillsDir = skillsDir;
    this.evolutionDir = path.join(dataDir, "evolution");
    this.init();
  }

  private init(): void {
    if (!fs.existsSync(this.evolutionDir)) {
      fs.mkdirSync(this.evolutionDir, { recursive: true });
    }
    this.loadEvolutions();
  }

  private loadEvolutions(): void {
    try {
      const files = fs.readdirSync(this.evolutionDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.evolutionDir, file), "utf-8");
        const evolution = JSON.parse(content) as SkillEvolution;
        this.evolutions.set(evolution.id, evolution);
      }
      this.updateStats();
    } catch {}
  }

  analyzePerformance(skillName: string, metrics: PerformanceMetrics): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    if (metrics.successRate < 0.7) {
      suggestions.push({
        id: `sugg-${Date.now()}-1`,
        skillName,
        type: "prompt",
        priority: "high",
        description: "Low success rate detected - consider improving prompt clarity",
        suggestedChange: "Add more specific instructions and examples",
        reason: `Success rate is ${Math.round(metrics.successRate * 100)}%, below 70% threshold`,
        basedOn: ["performance_metrics"],
      });
    }

    if (metrics.errorRate > 0.1) {
      suggestions.push({
        id: `sugg-${Date.now()}-2`,
        skillName,
        type: "prompt",
        priority: "high",
        description: "High error rate - add error handling guidance",
        suggestedChange: "Include error handling scenarios in prompt",
        reason: `Error rate is ${Math.round(metrics.errorRate * 100)}%, above 10% threshold`,
        basedOn: ["error_analysis"],
      });
    }

    if (metrics.userSatisfaction < 0.6) {
      suggestions.push({
        id: `sugg-${Date.now()}-3`,
        skillName,
        type: "example",
        priority: "medium",
        description: "Low user satisfaction - add more diverse examples",
        suggestedChange: "Include varied use case examples",
        reason: `User satisfaction is ${Math.round(metrics.userSatisfaction * 100)}%`,
        basedOn: ["user_feedback"],
      });
    }

    if (metrics.avgResponseTime > 5000) {
      suggestions.push({
        id: `sugg-${Date.now()}-4`,
        skillName,
        type: "prompt",
        priority: "low",
        description: "Slow response time - optimize prompt length",
        suggestedChange: "Reduce prompt verbosity while maintaining clarity",
        reason: `Avg response time is ${metrics.avgResponseTime}ms`,
        basedOn: ["performance_metrics"],
      });
    }

    for (const suggestion of suggestions) {
      this.suggestions.set(suggestion.id, suggestion);
    }

    return suggestions;
  }

  proposeEvolution(
    skillName: string,
    changes: SkillChange[],
    reason: string,
    createdBy: "agent" | "human" = "agent"
  ): SkillEvolution {
    const evolution: SkillEvolution = {
      id: `evo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      skillName,
      version: "0.0.0",
      changes,
      performance: {
        successRate: 0,
        avgResponseTime: 0,
        userSatisfaction: 0,
        errorRate: 0,
        usageCount: 0,
      },
      status: "draft",
      createdAt: new Date(),
      createdBy,
    };

    this.evolutions.set(evolution.id, evolution);
    this.saveEvolution(evolution);
    this.stats.totalEvolutions++;

    emitEvent("reasoning.start", "evolution", "system", {
      action: "evolution_proposed",
      skillName,
      changesCount: changes.length,
    });

    auditLog("skill.invoke", "propose_evolution", { skillName, evolutionId: evolution.id }, { source: "skill_evolver" });

    return evolution;
  }

  approveEvolution(evolutionId: string): boolean {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution || evolution.status !== "testing") return false;

    evolution.status = "approved";
    this.stats.approvedChanges++;
    this.saveEvolution(evolution);

    this.applyEvolution(evolution);

    emitEvent("reasoning.result", "evolution", "system", {
      action: "evolution_approved",
      skillName: evolution.skillName,
    });

    return true;
  }

  rejectEvolution(evolutionId: string, reason: string): boolean {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution) return false;

    evolution.status = "rejected";
    this.stats.rejectedChanges++;
    this.saveEvolution(evolution);

    emitEvent("reasoning.result", "evolution", "system", {
      action: "evolution_rejected",
      skillName: evolution.skillName,
      reason,
    });

    return true;
  }

  private applyEvolution(evolution: SkillEvolution): void {
    const skillPath = path.join(this.skillsDir, evolution.skillName, "SKILL.md");
    
    if (!fs.existsSync(skillPath)) return;

    let content = fs.readFileSync(skillPath, "utf-8");

    for (const change of evolution.changes) {
      if (change.type === "modify" && change.before && change.after) {
        content = content.replace(change.before, change.after);
      } else if (change.type === "add" && change.section === "prompt") {
        const promptMatch = content.match(/---\n[\s\S]*?\n---/);
        if (promptMatch) {
          const insertPos = promptMatch.index! + promptMatch[0].length;
          content = content.slice(0, insertPos) + "\n\n" + change.after + content.slice(insertPos);
        }
      }
    }

    fs.writeFileSync(skillPath, content);
  }

  autoEvolve(skillName: string): SkillEvolution | null {
    const suggestions = Array.from(this.suggestions.values())
      .filter((s) => s.skillName === skillName && s.priority === "high");

    if (suggestions.length === 0) return null;

    const changes: SkillChange[] = suggestions.map((s) => ({
      type: "modify" as const,
      section: s.type as SkillChange["section"],
      description: s.description,
      after: s.suggestedChange,
      reason: s.reason,
    }));

    return this.proposeEvolution(skillName, changes, "Auto-generated from performance analysis", "agent");
  }

  private saveEvolution(evolution: SkillEvolution): void {
    const filePath = path.join(this.evolutionDir, `${evolution.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(evolution, null, 2));
  }

  private updateStats(): void {
    const deployed = Array.from(this.evolutions.values()).filter((e) => e.status === "approved");
    
    if (deployed.length > 0) {
      const performances = deployed.map((e) => e.performance.successRate);
      this.stats.avgPerformanceGain = performances.reduce((a, b) => a + b, 0) / performances.length;
    }

    this.stats.topPerformers = Array.from(this.evolutions.values())
      .filter((e) => e.performance.successRate > 0.9)
      .map((e) => e.skillName)
      .slice(0, 5);

    this.stats.needsImprovement = Array.from(this.evolutions.values())
      .filter((e) => e.performance.successRate < 0.7)
      .map((e) => e.skillName)
      .slice(0, 5);
  }

  getEvolution(id: string): SkillEvolution | undefined {
    return this.evolutions.get(id);
  }

  getEvolutionsForSkill(skillName: string): SkillEvolution[] {
    return Array.from(this.evolutions.values())
      .filter((e) => e.skillName === skillName)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSuggestions(skillName?: string): ImprovementSuggestion[] {
    let suggestions = Array.from(this.suggestions.values());
    if (skillName) {
      suggestions = suggestions.filter((s) => s.skillName === skillName);
    }
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  getStats(): EvolutionStats {
    this.updateStats();
    return { ...this.stats };
  }

  testEvolution(evolutionId: string): boolean {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution || evolution.status !== "draft") return false;

    evolution.status = "testing";
    this.saveEvolution(evolution);

    return true;
  }

  updatePerformance(evolutionId: string, metrics: Partial<PerformanceMetrics>): void {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution) return;

    evolution.performance = {
      ...evolution.performance,
      ...metrics,
    };

    this.saveEvolution(evolution);
  }
}

export { SkillEvolver };
