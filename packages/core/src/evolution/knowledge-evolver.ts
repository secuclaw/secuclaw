/**
 * KnowledgeEvolver - Automatic knowledge base evolution for SecuClaw
 * 
 * Handles evolution and updates of:
 * - MITRE ATT&CK framework knowledge
 * - SCF 2025 control mappings
 * - Threat intelligence patterns
 * - Security playbooks and procedures
 */

export type KnowledgeDomain = 
  | 'mitre-attack'
  | 'scf-2025'
  | 'threat-intel'
  | 'playbooks'
  | 'vulnerabilities'
  | 'compliance';

export type KnowledgeSource = 
  | 'official'
  | 'community'
  | 'auto-learned'
  | 'manual'
  | 'integration';

export interface EvolvedKnowledge {
  id: string;
  domain: KnowledgeDomain;
  name: string;
  version: string;
  description: string;
  content: Record<string, unknown>;
  source: KnowledgeSource;
  tags: string[];
  relatedIds: string[];
  status: 'draft' | 'reviewing' | 'approved' | 'deprecated';
  confidence: number;
  testResults: KnowledgeTestResult[];
  performance: KnowledgePerformance;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: 'agent' | 'user' | 'integration';
    parentKnowledgeId?: string;
    sourceUrl?: string;
    verifiedBy?: string;
  };
}

export interface KnowledgeTestResult {
  id: string;
  executedAt: Date;
  passed: boolean;
  score: number;
  testType: 'validation' | 'accuracy' | 'relevance' | 'completeness';
  metrics: Record<string, number>;
  errors: string[];
  feedback?: string;
}

export interface KnowledgePerformance {
  usageCount: number;
  hitRate: number;
  avgRelevanceScore: number;
  lastUsed?: Date;
  feedbackScore?: number;
}

export interface KnowledgeEvolutionContext {
  agentId: string;
  domain: KnowledgeDomain;
  triggerReason: 'gap' | 'update' | 'new-threat' | 'compliance-change' | 'user-request';
  description: string;
  existingKnowledge: string[];
  relatedData?: Record<string, unknown>;
  externalSource?: {
    type: 'misp' | 'otx' | 'taxii' | 'manual';
    data: unknown;
  };
}

export interface KnowledgeEvolutionConfig {
  maxIterations: number;
  minConfidence: number;
  autoApproveCommunity: boolean;
  requireVerification: boolean;
  updateIntervalMs: number;
}

export const DEFAULT_KNOWLEDGE_EVOLUTION_CONFIG: KnowledgeEvolutionConfig = {
  maxIterations: 3,
  minConfidence: 0.7,
  autoApproveCommunity: false,
  requireVerification: true,
  updateIntervalMs: 24 * 60 * 60 * 1000,
};

export class KnowledgeEvolver {
  private knowledge: Map<string, EvolvedKnowledge> = new Map();
  private config: KnowledgeEvolutionConfig;
  private evolutionHistory: Array<{
    id: string;
    context: KnowledgeEvolutionContext;
    result: EvolvedKnowledge | null;
    timestamp: Date;
  }> = [];

  constructor(config: Partial<KnowledgeEvolutionConfig> = {}) {
    this.config = { ...DEFAULT_KNOWLEDGE_EVOLUTION_CONFIG, ...config };
  }

  async analyzeKnowledgeGap(context: KnowledgeEvolutionContext): Promise<{
    hasGap: boolean;
    gapDescription?: string;
    suggestedAction?: 'create' | 'update' | 'merge' | 'deprecate';
  }> {
    const { domain, triggerReason, description, existingKnowledge } = context;

    switch (triggerReason) {
      case 'new-threat':
        return {
          hasGap: true,
          gapDescription: `New threat detected requiring knowledge update: ${description}`,
          suggestedAction: 'create',
        };

      case 'compliance-change':
        return {
          hasGap: true,
          gapDescription: `Compliance framework change detected: ${description}`,
          suggestedAction: 'update',
        };

      case 'update':
        const existingEntry = this.findKnowledgeByDescription(domain, description);
        if (existingEntry) {
          return {
            hasGap: true,
            gapDescription: `Existing knowledge needs update: ${existingEntry.name}`,
            suggestedAction: 'update',
          };
        }
        break;

      case 'gap':
        const keywords = this.extractKeywords(description);
        const relevantKnowledge = this.findRelevantKnowledge(domain, keywords, existingKnowledge);
        
        if (relevantKnowledge.length === 0) {
          return {
            hasGap: true,
            gapDescription: `No knowledge found for: ${keywords.join(', ')}`,
            suggestedAction: 'create',
          };
        }
        break;
    }

    return { hasGap: false };
  }

  async generateKnowledge(context: KnowledgeEvolutionContext): Promise<EvolvedKnowledge> {
    const knowledgeId = `kb-${context.domain}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const knowledge: EvolvedKnowledge = {
      id: knowledgeId,
      domain: context.domain,
      name: this.generateKnowledgeName(context),
      version: '1.0.0',
      description: context.description,
      content: await this.generateKnowledgeContent(context),
      source: context.externalSource ? 'integration' : 'auto-learned',
      tags: this.generateTags(context),
      relatedIds: this.findRelatedKnowledgeIds(context),
      status: 'draft',
      confidence: 0.5,
      testResults: [],
      performance: {
        usageCount: 0,
        hitRate: 0,
        avgRelevanceScore: 0,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'agent',
        sourceUrl: context.externalSource?.type,
      },
    };

    this.knowledge.set(knowledgeId, knowledge);
    return knowledge;
  }

  async testKnowledge(knowledgeId: string): Promise<KnowledgeTestResult> {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) {
      throw new Error(`Knowledge not found: ${knowledgeId}`);
    }

    const testId = `test-${Date.now()}`;
    const errors: string[] = [];
    let score = 0;
    const metrics: Record<string, number> = {};

    if (!entry.name || entry.name.length < 3) {
      errors.push('Knowledge name is too short');
    } else {
      score += 0.15;
    }

    if (!entry.description || entry.description.length < 20) {
      errors.push('Knowledge description is too brief');
    } else {
      score += 0.15;
    }

    if (!entry.content || Object.keys(entry.content).length === 0) {
      errors.push('Knowledge content is empty');
    } else {
      score += 0.2;
      const contentScore = this.assessContentQuality(entry.content, entry.domain);
      metrics.contentQuality = contentScore;
      score += contentScore * 0.2;
    }

    if (!entry.tags || entry.tags.length === 0) {
      errors.push('No tags defined for knowledge');
    } else {
      score += 0.1;
    }

    const domainScore = this.validateDomainSpecific(entry);
    metrics.domainValidation = domainScore;
    score += domainScore * 0.1;

    if (entry.relatedIds.length > 0) {
      const validRelated = entry.relatedIds.filter(id => this.knowledge.has(id));
      if (validRelated.length < entry.relatedIds.length) {
        errors.push('Some related knowledge references are invalid');
      }
      metrics.relatedValidRatio = validRelated.length / entry.relatedIds.length;
    }

    const passed = score >= this.config.minConfidence;

    const result: KnowledgeTestResult = {
      id: testId,
      executedAt: new Date(),
      passed,
      score,
      testType: 'validation',
      metrics,
      errors,
      feedback: passed 
        ? 'Knowledge passed validation' 
        : `Knowledge needs improvement: ${errors.join(', ')}`,
    };

    entry.testResults.push(result);
    entry.status = passed ? 'reviewing' : 'draft';

    return result;
  }

  async iterateKnowledge(knowledgeId: string, feedback: string): Promise<EvolvedKnowledge | null> {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return null;

    const versionParts = entry.version.split('.').map(Number);
    versionParts[2]++;
    entry.version = versionParts.join('.');
    entry.metadata.updatedAt = new Date();
    entry.metadata.parentKnowledgeId = knowledgeId;

    if (feedback.includes('content') || feedback.includes('accuracy')) {
      entry.content = this.enhanceContent(entry.content, feedback, entry.domain);
      entry.confidence = Math.min(1, entry.confidence + 0.1);
    }

    if (feedback.includes('tag') || feedback.includes('categorize')) {
      const newTags = this.extractKeywords(feedback);
      entry.tags = [...new Set([...entry.tags, ...newTags])];
    }

    if (feedback.includes('relate') || feedback.includes('connect')) {
      const relatedIds = this.findRelatedKnowledgeIds({
        agentId: 'system',
        domain: entry.domain,
        triggerReason: 'update',
        description: feedback,
        existingKnowledge: [],
      });
      entry.relatedIds = [...new Set([...entry.relatedIds, ...relatedIds])];
    }








    entry.testResults = [];
    entry.status = 'draft';

    return entry;
  }

  async approveKnowledge(knowledgeId: string, verifiedBy?: string): Promise<boolean> {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return false;

    const latestTest = entry.testResults[entry.testResults.length - 1];
    if (!latestTest || !latestTest.passed) {
      return false;
    }

    if (this.config.requireVerification && entry.source === 'community' && !verifiedBy) {
      return false;
    }

    entry.status = 'approved';
    if (verifiedBy) {
      entry.metadata.verifiedBy = verifiedBy;
    }
    entry.confidence = Math.max(entry.confidence, 0.8);

    return true;
  }

  deprecateKnowledge(knowledgeId: string, reason: string): boolean {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return false;

    entry.status = 'deprecated';
    entry.metadata.updatedAt = new Date();
    
    return true;
  }

  recordKnowledgeUsage(
    knowledgeId: string, 
    hit: boolean, 
    relevanceScore?: number,
    userFeedback?: number
  ): void {
    const entry = this.knowledge.get(knowledgeId);
    if (!entry) return;

    entry.performance.usageCount++;
    entry.performance.lastUsed = new Date();

    const totalHits = entry.performance.hitRate * (entry.performance.usageCount - 1) + (hit ? 1 : 0);
    entry.performance.hitRate = totalHits / entry.performance.usageCount;

    if (relevanceScore !== undefined) {
      const totalRelevance = entry.performance.avgRelevanceScore * (entry.performance.usageCount - 1) + relevanceScore;
      entry.performance.avgRelevanceScore = totalRelevance / entry.performance.usageCount;
    }

    if (userFeedback !== undefined) {
      entry.performance.feedbackScore = userFeedback;
    }
  }

  async mergeKnowledge(primaryId: string, secondaryIds: string[]): Promise<EvolvedKnowledge | null> {
    const primary = this.knowledge.get(primaryId);
    if (!primary) return null;

    const secondaries = secondaryIds
      .map(id => this.knowledge.get(id))
      .filter((k): k is EvolvedKnowledge => k !== undefined);

    if (secondaries.length === 0) return null;

    for (const secondary of secondaries) {
      primary.content = { ...primary.content, ...secondary.content };
      primary.tags = [...new Set([...primary.tags, ...secondary.tags])];
      primary.relatedIds = [...new Set([...primary.relatedIds, ...secondary.relatedIds])];
      secondary.status = 'deprecated';
    }

    const versionParts = primary.version.split('.').map(Number);
    versionParts[1]++;
    primary.version = versionParts.join('.');
    primary.metadata.updatedAt = new Date();

    return primary;
  }

  getKnowledge(knowledgeId: string): EvolvedKnowledge | undefined {
    return this.knowledge.get(knowledgeId);
  }

  listKnowledge(domain?: KnowledgeDomain, status?: EvolvedKnowledge['status']): EvolvedKnowledge[] {
    let entries = Array.from(this.knowledge.values());
    
    if (domain) {
      entries = entries.filter(k => k.domain === domain);
    }
    if (status) {
      entries = entries.filter(k => k.status === status);
    }
    
    return entries;
  }

  searchKnowledge(query: string, domain?: KnowledgeDomain): EvolvedKnowledge[] {
    const keywords = this.extractKeywords(query);
    const entries = Array.from(this.knowledge.values());

    return entries
      .filter(k => !domain || k.domain === domain)
      .filter(k => k.status === 'approved')
      .map(k => ({
        knowledge: k,
        score: this.calculateRelevanceScore(k, keywords),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.knowledge);
  }

  getStats(): {
    totalKnowledge: number;
    approvedKnowledge: number;
    draftKnowledge: number;
    byDomain: Record<KnowledgeDomain, number>;
    avgConfidence: number;
    avgHitRate: number;
  } {
    const entries = Array.from(this.knowledge.values());
    const byDomain: Record<KnowledgeDomain, number> = {
      'mitre-attack': 0,
      'scf-2025': 0,
      'threat-intel': 0,
      'playbooks': 0,
      'vulnerabilities': 0,
      'compliance': 0,
    };

    for (const entry of entries) {
      byDomain[entry.domain]++;
    }

    return {
      totalKnowledge: entries.length,
      approvedKnowledge: entries.filter(k => k.status === 'approved').length,
      draftKnowledge: entries.filter(k => k.status === 'draft').length,
      byDomain,
      avgConfidence: entries.reduce((sum, k) => sum + k.confidence, 0) / (entries.length || 1),
      avgHitRate: entries.reduce((sum, k) => sum + k.performance.hitRate, 0) / (entries.length || 1),
    };
  }

  // Private helper methods

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
      'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 15);
  }

  private findKnowledgeByDescription(domain: KnowledgeDomain, description: string): EvolvedKnowledge | undefined {
    const keywords = this.extractKeywords(description);
    
    for (const entry of this.knowledge.values()) {
      if (entry.domain !== domain) continue;
      
      const entryKeywords = this.extractKeywords(`${entry.name} ${entry.description}`);
      const overlap = keywords.filter(kw => entryKeywords.includes(kw));
      
      if (overlap.length >= Math.min(3, keywords.length * 0.5)) {
        return entry;
      }
    }
    
    return undefined;
  }

  private findRelevantKnowledge(
    domain: KnowledgeDomain, 
    keywords: string[], 
    existingIds: string[]
  ): EvolvedKnowledge[] {
    const results: EvolvedKnowledge[] = [];

    for (const entry of this.knowledge.values()) {
      if (entry.domain !== domain || existingIds.includes(entry.id)) continue;
      
      const entryKeywords = this.extractKeywords(`${entry.name} ${entry.description} ${entry.tags.join(' ')}`);
      const overlap = keywords.filter(kw => entryKeywords.includes(kw));
      
      if (overlap.length > 0) {
        results.push(entry);
      }
    }

    return results;
  }

  private generateKnowledgeName(context: KnowledgeEvolutionContext): string {
    const keywords = this.extractKeywords(context.description);
    const prefix = context.domain.replace('-', '_');
    return `${prefix}_${keywords.slice(0, 3).join('_')}`.substring(0, 50);
  }

  private async generateKnowledgeContent(context: KnowledgeEvolutionContext): Promise<Record<string, unknown>> {
    const baseContent: Record<string, unknown> = {
      summary: context.description,
      createdAt: new Date().toISOString(),
      domain: context.domain,
    };

    switch (context.domain) {
      case 'mitre-attack':
        return {
          ...baseContent,
          technique: null,
          tactics: [],
          mitigations: [],
          detection: [],
          references: [],
        };

      case 'scf-2025':
        return {
          ...baseContent,
          controlId: null,
          category: null,
          requirements: [],
          implementation: [],
          evidence: [],
        };

      case 'threat-intel':
        return {
          ...baseContent,
          indicators: [],
          threatActors: [],
          campaigns: [],
          malware: [],
          timeline: [],
        };

      case 'playbooks':
        return {
          ...baseContent,
          steps: [],
          triggers: [],
          roles: [],
          escalation: [],
          automation: [],
        };

      case 'vulnerabilities':
        return {
          ...baseContent,
          cve: null,
          severity: null,
          affectedSystems: [],
          remediation: [],
          references: [],
        };

      case 'compliance':
        return {
          ...baseContent,
          framework: null,
          requirements: [],
          controls: [],
          evidence: [],
          gaps: [],
        };

      default:
        return baseContent;
    }
  }

  private generateTags(context: KnowledgeEvolutionContext): string[] {
    const tags: string[] = [context.domain];
    
    switch (context.triggerReason) {
      case 'new-threat':
        tags.push('threat', 'recent');
        break;
      case 'compliance-change':
        tags.push('compliance', 'updated');
        break;
      case 'update':
        tags.push('updated');
        break;
    }

    const domainTags: Partial<Record<KnowledgeDomain, string[]>> = {
      'mitre-attack': ['framework', 'attack-pattern'],
      'scf-2025': ['framework', 'controls'],
      'threat-intel': ['intelligence', 'indicators'],
      'playbooks': ['procedures', 'response'],
      'vulnerabilities': ['security', 'cve'],
      'compliance': ['regulatory', 'audit'],
    };

    return [...new Set([...tags, ...(domainTags[context.domain] || [])])];
  }

  private findRelatedKnowledgeIds(context: KnowledgeEvolutionContext): string[] {
    const keywords = this.extractKeywords(context.description);
    const related: string[] = [];

    for (const entry of this.knowledge.values()) {
      if (entry.id === context.existingKnowledge[0]) continue;
      
      const entryKeywords = this.extractKeywords(`${entry.name} ${entry.description}`);
      const overlap = keywords.filter(kw => entryKeywords.includes(kw));
      
      if (overlap.length >= 2) {
        related.push(entry.id);
      }
    }

    return related.slice(0, 10);
  }

  private assessContentQuality(content: Record<string, unknown>, domain: KnowledgeDomain): number {
    let score = 0;
    const keys = Object.keys(content);

    if (keys.length > 0) score += 0.3;

    switch (domain) {
      case 'mitre-attack':
        if ('technique' in content) score += 0.2;
        if ('tactics' in content && Array.isArray(content.tactics)) score += 0.2;
        if ('mitigations' in content) score += 0.15;
        if ('detection' in content) score += 0.15;
        break;

      case 'scf-2025':
        if ('controlId' in content) score += 0.2;
        if ('requirements' in content && Array.isArray(content.requirements)) score += 0.2;
        if ('implementation' in content) score += 0.3;
        break;

      case 'threat-intel':
        if ('indicators' in content && Array.isArray(content.indicators)) score += 0.3;
        if ('threatActors' in content) score += 0.2;
        if ('timeline' in content) score += 0.2;
        break;

      case 'playbooks':
        if ('steps' in content && Array.isArray(content.steps)) score += 0.3;
        if ('triggers' in content) score += 0.2;
        if ('roles' in content) score += 0.2;
        break;

      default:
        score += Math.min(keys.length * 0.1, 0.7);
    }

    return Math.min(score, 1);
  }

  private validateDomainSpecific(entry: EvolvedKnowledge): number {
    switch (entry.domain) {
      case 'mitre-attack':
        return this.validateMitreAttack(entry);
      case 'scf-2025':
        return this.validateSCF2025(entry);
      case 'threat-intel':
        return this.validateThreatIntel(entry);
      default:
        return 1;
    }
  }

  private validateMitreAttack(entry: EvolvedKnowledge): number {
    const content = entry.content;
    let score = 1;

    if (!content.technique && !content.tactics) {
      score -= 0.3;
    }

    if (content.technique && typeof content.technique === 'string') {
      if (!/^T\d{4}(\.\d{3})?$/.test(content.technique)) {
        score -= 0.2;
      }
    }

    return Math.max(score, 0);
  }

  private validateSCF2025(entry: EvolvedKnowledge): number {
    const content = entry.content;
    let score = 1;

    if (!content.controlId && !content.requirements) {
      score -= 0.3;
    }

    if (content.controlId && typeof content.controlId === 'string') {
      if (!/^[A-Z]{2,4}-\d{2,3}$/.test(content.controlId)) {
        score -= 0.2;
      }
    }

    return Math.max(score, 0);
  }

  private validateThreatIntel(entry: EvolvedKnowledge): number {
    const content = entry.content;
    let score = 1;

    if (!content.indicators && !content.threatActors && !content.malware) {
      score -= 0.4;
    }

    if (content.indicators && Array.isArray(content.indicators)) {
      const validIndicators = content.indicators.filter((ind: unknown) => {
        if (typeof ind !== 'object' || ind === null) return false;
        const indicator = ind as Record<string, unknown>;
        return indicator.type && indicator.value;
      });
      
      if (validIndicators.length < content.indicators.length * 0.8) {
        score -= 0.2;
      }
    }

    return Math.max(score, 0);
  }

  private enhanceContent(
    content: Record<string, unknown>, 
    feedback: string, 
    domain: KnowledgeDomain
  ): Record<string, unknown> {
    const enhanced = { ...content };

    const keywords = this.extractKeywords(feedback);

    enhanced._enhancementNotes = enhanced._enhancementNotes || [];
    (enhanced._enhancementNotes as unknown[]).push({
      timestamp: new Date().toISOString(),
      feedback: keywords,
    });

    switch (domain) {
      case 'mitre-attack':
        if (feedback.includes('tactic') && !enhanced.tactics) {
          enhanced.tactics = [];
        }
        if (feedback.includes('mitigation') && !enhanced.mitigations) {
          enhanced.mitigations = [];
        }
        break;

      case 'threat-intel':
        if (feedback.includes('indicator') && !enhanced.indicators) {
          enhanced.indicators = [];
        }
        if (feedback.includes('actor') && !enhanced.threatActors) {
          enhanced.threatActors = [];
        }
        break;
    }

    return enhanced;
  }

  private calculateRelevanceScore(entry: EvolvedKnowledge, keywords: string[]): number {
    const entryText = `${entry.name} ${entry.description} ${entry.tags.join(' ')}`.toLowerCase();
    const entryKeywords = this.extractKeywords(entryText);
    
    const matchingKeywords = keywords.filter(kw => entryKeywords.includes(kw));
    const baseScore = matchingKeywords.length / Math.max(keywords.length, 1);
    
    const confidenceBoost = entry.confidence * 0.2;
    const performanceBoost = entry.performance.hitRate * 0.1;
    
    return Math.min(baseScore + confidenceBoost + performanceBoost, 1);
  }
}

export function createKnowledgeEvolver(config?: Partial<KnowledgeEvolutionConfig>): KnowledgeEvolver {
  return new KnowledgeEvolver(config);
}
