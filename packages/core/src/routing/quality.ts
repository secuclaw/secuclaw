import type { ChatResponse } from "../providers/types.js";

export interface QualityMetrics {
  coherence: number;
  relevance: number;
  accuracy: number;
  completeness: number;
  safetyScore: number;
  overall: number;
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  metrics: QualityMetrics;
  issues: string[];
  suggestions: string[];
  flagged?: boolean;
  flagReason?: string;
}

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  check: (response: ChatResponse, context?: QualityCheckContext) => number;
  weight: number;
  threshold: number;
}

export interface QualityCheckContext {
  task?: string;
  expectedFormat?: string;
  requiredKeywords?: string[];
  maxLength?: number;
  minLength?: number;
  language?: string;
}

const DEFAULT_RULES: QualityRule[] = [
  {
    id: "non-empty",
    name: "Non-Empty Response",
    description: "Response must contain meaningful content",
    check: (response) => {
      const content = response.content.trim();
      if (!content) return 0;
      if (content.length < 10) return 0.5;
      return 1;
    },
    weight: 1.0,
    threshold: 0.5,
  },
  {
    id: "no-repetition",
    name: "No Excessive Repetition",
    description: "Response should not contain excessive repetition",
    check: (response) => {
      const words = response.content.toLowerCase().split(/\s+/);
      if (words.length < 10) return 1;
      
      const wordCounts = new Map<string, number>();
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
      
      const maxCount = Math.max(...wordCounts.values());
      const repetitionRatio = maxCount / words.length;
      
      if (repetitionRatio > 0.3) return 0.3;
      if (repetitionRatio > 0.2) return 0.6;
      return 1;
    },
    weight: 0.7,
    threshold: 0.5,
  },
  {
    id: "reasonable-length",
    name: "Reasonable Length",
    description: "Response length should be appropriate",
    check: (response, context) => {
      const length = response.content.length;
      const maxLength = context?.maxLength ?? 10000;
      const minLength = context?.minLength ?? 10;
      
      if (length < minLength) return 0.3;
      if (length > maxLength) return 0.5;
      return 1;
    },
    weight: 0.5,
    threshold: 0.4,
  },
  {
    id: "no-harmful-content",
    name: "No Harmful Content",
    description: "Response should not contain harmful or dangerous content",
    check: (response) => {
      const harmfulPatterns = [
        /\b(create|build|make)\s+(bomb|weapon|explosive)\b/i,
        /\b(hack|exploit)\s+(into|bank|government)\b/i,
        /\b(illegal|illicit)\s+(drugs|activities)\b/i,
      ];
      
      for (const pattern of harmfulPatterns) {
        if (pattern.test(response.content)) {
          return 0;
        }
      }
      return 1;
    },
    weight: 1.0,
    threshold: 0.9,
  },
  {
    id: "structured-output",
    name: "Structured Output",
    description: "Response should have proper structure",
    check: (response) => {
      const content = response.content;
      
      const hasParagraphs = content.split("\n\n").length > 1;
      const hasLists = /^[\s]*[-*]\s/m.test(content) || /^\s*\d+\.\s/m.test(content);
      const hasCodeBlocks = /```/.test(content);
      
      const structureScore = [hasParagraphs, hasLists, hasCodeBlocks].filter(Boolean).length;
      return structureScore / 3;
    },
    weight: 0.3,
    threshold: 0.2,
  },
];

export class QualityAssuranceEngine {
  private rules: Map<string, QualityRule> = new Map();
  private minOverallScore: number;

  constructor(options?: { rules?: QualityRule[]; minScore?: number }) {
    this.minOverallScore = options?.minScore ?? 0.6;
    
    const rulesToUse = options?.rules ?? DEFAULT_RULES;
    for (const rule of rulesToUse) {
      this.rules.set(rule.id, rule);
    }
  }

  addRule(rule: QualityRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  check(response: ChatResponse, context?: QualityCheckContext): QualityCheckResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const metrics: Partial<QualityMetrics> = {};
    
    let totalWeight = 0;
    let weightedScore = 0;
    let flagged = false;
    let flagReason: string | undefined;

    for (const rule of this.rules.values()) {
      const score = rule.check(response, context);
      
      if (score < rule.threshold) {
        issues.push(`Rule "${rule.name}" failed with score ${score.toFixed(2)} (threshold: ${rule.threshold})`);
        
        if (rule.id === "no-harmful-content" && score < 0.5) {
          flagged = true;
          flagReason = "Potentially harmful content detected";
        }
      }

      weightedScore += score * rule.weight;
      totalWeight += rule.weight;
    }

    const overall = totalWeight > 0 ? weightedScore / totalWeight : 0;

    if (overall < 0.5) {
      suggestions.push("Consider regenerating the response with more specific instructions");
    }
    if (issues.some(i => i.includes("repetition"))) {
      suggestions.push("Reduce repetition and vary language");
    }
    if (issues.some(i => i.includes("structure"))) {
      suggestions.push("Improve response structure with paragraphs and lists");
    }

    return {
      passed: overall >= this.minOverallScore && !flagged,
      score: overall,
      metrics: {
        coherence: this.calculateCoherence(response),
        relevance: this.calculateRelevance(response, context),
        accuracy: 0.7,
        completeness: this.calculateCompleteness(response, context),
        safetyScore: flagged ? 0 : 1,
        overall,
      },
      issues,
      suggestions,
      flagged,
      flagReason,
    };
  }

  private calculateCoherence(response: ChatResponse): number {
    const sentences = response.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 0.8;
    
    let coherentCount = 0;
    for (let i = 1; i < sentences.length; i++) {
      const prevWords = new Set(sentences[i - 1].toLowerCase().split(/\s+/));
      const currWords = sentences[i].toLowerCase().split(/\s+/);
      
      const overlap = currWords.filter(w => prevWords.has(w)).length;
      if (overlap > 0) coherentCount++;
    }
    
    return coherentCount / (sentences.length - 1);
  }

  private calculateRelevance(response: ChatResponse, context?: QualityCheckContext): number {
    if (!context?.requiredKeywords?.length) return 0.8;
    
    const content = response.content.toLowerCase();
    const foundKeywords = context.requiredKeywords.filter(kw => 
      content.includes(kw.toLowerCase())
    );
    
    return foundKeywords.length / context.requiredKeywords.length;
  }

  private calculateCompleteness(response: ChatResponse, context?: QualityCheckContext): number {
    const content = response.content;
    
    if (content.includes("I cannot") || content.includes("I'm unable to")) {
      return 0.4;
    }
    
    if (content.length < 50) return 0.5;
    if (content.length < 100) return 0.7;
    return 0.9;
  }

  compareResponses(responses: ChatResponse[], context?: QualityCheckContext): {
    best: ChatResponse;
    bestIndex: number;
    results: QualityCheckResult[];
  } {
    const results = responses.map(r => this.check(r, context));
    const scores = results.map(r => r.score);
    const bestIndex = scores.indexOf(Math.max(...scores));
    
    return {
      best: responses[bestIndex],
      bestIndex,
      results,
    };
  }

  getRules(): QualityRule[] {
    return Array.from(this.rules.values());
  }

  setMinScore(score: number): void {
    this.minOverallScore = score;
  }
}

let engineInstance: QualityAssuranceEngine | null = null;

export function getQualityEngine(): QualityAssuranceEngine {
  if (!engineInstance) {
    engineInstance = new QualityAssuranceEngine();
  }
  return engineInstance;
}

export function resetQualityEngine(): void {
  engineInstance = null;
}
