import * as fs from "node:fs";
import * as path from "node:path";
import { emitEvent } from "../events/stream.js";
import { auditLog } from "../audit/logger.js";

export interface SecurityCase {
  id: string;
  title: string;
  type: "incident" | "threat" | "vulnerability" | "attack" | "defense";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  timeline: CaseEvent[];
  indicators: Indicator[];
  mitreTechniques: string[];
  mitreTactics: string[];
  response: string;
  outcome: "success" | "partial" | "failure";
  lessons: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseEvent {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface Indicator {
  type: "ip" | "domain" | "hash" | "url" | "email" | "pattern";
  value: string;
  confidence: number;
  context: string;
}

export interface CasePattern {
  id: string;
  name: string;
  conditions: PatternCondition[];
  actions: PatternAction[];
  confidence: number;
  occurrences: number;
  lastMatched: Date;
}

export interface PatternCondition {
  field: string;
  operator: "equals" | "contains" | "matches" | "gt" | "lt";
  value: string | number;
}

export interface PatternAction {
  type: "alert" | "block" | "investigate" | "mitigate";
  priority: number;
  description: string;
}

export interface LearningStats {
  totalCases: number;
  patternsLearned: number;
  patternsApplied: number;
  accuracy: number;
  lastUpdated: Date;
}

class CaseLearner {
  private cases: Map<string, SecurityCase> = new Map();
  private patterns: Map<string, CasePattern> = new Map();
  private caseDir: string;
  private stats: LearningStats = {
    totalCases: 0,
    patternsLearned: 0,
    patternsApplied: 0,
    accuracy: 0,
    lastUpdated: new Date(),
  };

  constructor(dataDir: string) {
    this.caseDir = path.join(dataDir, "cases");
    this.init();
  }

  private init(): void {
    if (!fs.existsSync(this.caseDir)) {
      fs.mkdirSync(this.caseDir, { recursive: true });
    }
    this.loadCases();
  }

  private loadCases(): void {
    try {
      const files = fs.readdirSync(this.caseDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(this.caseDir, file), "utf-8");
        const caseData = JSON.parse(content) as SecurityCase;
        this.cases.set(caseData.id, caseData);
      }
      this.stats.totalCases = this.cases.size;
    } catch {}
  }

  addCase(caseData: Omit<SecurityCase, "id" | "createdAt" | "updatedAt">): SecurityCase {
    const newCase: SecurityCase = {
      ...caseData,
      id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cases.set(newCase.id, newCase);
    this.saveCase(newCase);
    this.stats.totalCases++;

    emitEvent("reasoning.start", "learning", "system", {
      action: "case_added",
      caseId: newCase.id,
      type: newCase.type,
    });

    auditLog("data.access", "add_case", { caseId: newCase.id, type: newCase.type }, { source: "case_learner" });

    this.extractPatterns(newCase);

    return newCase;
  }

  private saveCase(caseData: SecurityCase): void {
    const filePath = path.join(this.caseDir, `${caseData.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(caseData, null, 2));
  }

  private extractPatterns(caseData: SecurityCase): void {
    const patternCandidates: PatternCondition[][] = [];

    for (const indicator of caseData.indicators) {
      patternCandidates.push([
        { field: `indicator.${indicator.type}`, operator: "equals", value: indicator.value },
      ]);
    }

    for (const technique of caseData.mitreTechniques) {
      patternCandidates.push([
        { field: "mitre.technique", operator: "equals", value: technique },
      ]);
    }

    for (const conditions of patternCandidates) {
      const existingPattern = this.findMatchingPattern(conditions);
      
      if (existingPattern) {
        existingPattern.occurrences++;
        existingPattern.lastMatched = new Date();
        existingPattern.confidence = Math.min(existingPattern.confidence + 0.05, 1);
      } else {
        const newPattern: CasePattern = {
          id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: `Pattern from ${caseData.title}`,
          conditions,
          actions: [
            {
              type: caseData.severity === "critical" ? "block" : "alert",
              priority: caseData.severity === "critical" ? 1 : caseData.severity === "high" ? 2 : 3,
              description: `Based on case: ${caseData.title}`,
            },
          ],
          confidence: 0.5,
          occurrences: 1,
          lastMatched: new Date(),
        };
        
        this.patterns.set(newPattern.id, newPattern);
        this.stats.patternsLearned++;
      }
    }

    this.stats.lastUpdated = new Date();
  }

  private findMatchingPattern(conditions: PatternCondition[]): CasePattern | null {
    for (const pattern of this.patterns.values()) {
      if (this.conditionsMatch(pattern.conditions, conditions)) {
        return pattern;
      }
    }
    return null;
  }

  private conditionsMatch(a: PatternCondition[], b: PatternCondition[]): boolean {
    if (a.length !== b.length) return false;
    
    for (const condA of a) {
      const match = b.find(
        (condB) =>
          condB.field === condA.field &&
          condB.operator === condA.operator &&
          condB.value === condA.value
      );
      if (!match) return false;
    }
    
    return true;
  }

  matchPatterns(data: Record<string, unknown>): CasePattern[] {
    const matches: CasePattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (this.evaluatePattern(pattern, data)) {
        matches.push(pattern);
        pattern.occurrences++;
        pattern.lastMatched = new Date();
        this.stats.patternsApplied++;
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private evaluatePattern(pattern: CasePattern, data: Record<string, unknown>): boolean {
    for (const condition of pattern.conditions) {
      const value = this.getNestedValue(data, condition.field);
      
      if (value === undefined) return false;

      switch (condition.operator) {
        case "equals":
          if (value !== condition.value) return false;
          break;
        case "contains":
          if (typeof value !== "string" || !value.includes(condition.value as string)) return false;
          break;
        case "matches":
          try {
            if (!new RegExp(condition.value as string).test(String(value))) return false;
          } catch {
            return false;
          }
          break;
        case "gt":
          if (typeof value !== "number" || value <= (condition.value as number)) return false;
          break;
        case "lt":
          if (typeof value !== "number" || value >= (condition.value as number)) return false;
          break;
      }
    }

    return true;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }

  getCase(id: string): SecurityCase | undefined {
    return this.cases.get(id);
  }

  searchCases(query: {
    type?: SecurityCase["type"];
    severity?: SecurityCase["severity"];
    tags?: string[];
    mitreTechnique?: string;
  }): SecurityCase[] {
    let results = Array.from(this.cases.values());

    if (query.type) {
      results = results.filter((c) => c.type === query.type);
    }
    if (query.severity) {
      results = results.filter((c) => c.severity === query.severity);
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter((c) => query.tags!.some((t) => c.tags.includes(t)));
    }
    if (query.mitreTechnique) {
      results = results.filter((c) => c.mitreTechniques.includes(query.mitreTechnique!));
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPatterns(): CasePattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.occurrences - a.occurrences);
  }

  getStats(): LearningStats {
    return { ...this.stats };
  }

  updateCase(id: string, updates: Partial<SecurityCase>): SecurityCase | null {
    const caseData = this.cases.get(id);
    if (!caseData) return null;

    const updated = {
      ...caseData,
      ...updates,
      updatedAt: new Date(),
    };

    this.cases.set(id, updated);
    this.saveCase(updated);

    return updated;
  }

  getSimilarCases(caseId: string, limit: number = 5): SecurityCase[] {
    const sourceCase = this.cases.get(caseId);
    if (!sourceCase) return [];

    const similarities: Array<{ case: SecurityCase; score: number }> = [];

    for (const caseData of this.cases.values()) {
      if (caseData.id === caseId) continue;

      let score = 0;

      for (const technique of sourceCase.mitreTechniques) {
        if (caseData.mitreTechniques.includes(technique)) score += 2;
      }

      for (const tactic of sourceCase.mitreTactics) {
        if (caseData.mitreTactics.includes(tactic)) score += 1;
      }

      for (const tag of sourceCase.tags) {
        if (caseData.tags.includes(tag)) score += 0.5;
      }

      if (sourceCase.type === caseData.type) score += 1;
      if (sourceCase.severity === caseData.severity) score += 0.5;

      similarities.push({ case: caseData, score });
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.case);
  }
}

export { CaseLearner };
