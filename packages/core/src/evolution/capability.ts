export type SkillLayer = 'bundled' | 'managed' | 'workspace' | 'plugin';

export interface EvolvedSkill {
  id: string;
  version: string;
  name: string;
  description: string;
  layer: SkillLayer;
  triggers: string[];
  instructions: string;
  examples: Array<{ input: string; output: string }>;
  tools: string[];
  createdAt: Date;
  updatedAt: Date;
  generatedBy: 'agent' | 'user' | 'import';
  testResults: SkillTestResult[];
  status: 'draft' | 'testing' | 'approved' | 'deprecated';
  performance: SkillPerformance;
  parentSkillId?: string;
}

export interface SkillTestResult {
  id: string;
  executedAt: Date;
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  errors: string[];
  feedback?: string;
}

export interface SkillPerformance {
  usageCount: number;
  successRate: number;
  avgExecutionTimeMs: number;
  lastUsed?: Date;
  userRating?: number;
}

export interface EvolutionContext {
  agentId: string;
  sessionId: string;
  taskDescription: string;
  failedAttempts: number;
  availableTools: string[];
  existingSkills: string[];
  performanceGap?: string;
}

export interface EvolutionResult {
  skill: EvolvedSkill | null;
  reason: string;
  confidence: number;
  testResult?: SkillTestResult;
}

export interface SkillEvolutionConfig {
  maxIterations: number;
  minTestScore: number;
  autoApprove: boolean;
  trackPerformance: boolean;
}

export const DEFAULT_EVOLUTION_CONFIG: SkillEvolutionConfig = {
  maxIterations: 5,
  minTestScore: 0.7,
  autoApprove: false,
  trackPerformance: true,
};

export class CapabilityEvolver {
  private skills: Map<string, EvolvedSkill> = new Map();
  private config: SkillEvolutionConfig;
  private evolutionHistory: Array<{
    id: string;
    context: EvolutionContext;
    result: EvolutionResult;
    timestamp: Date;
  }> = [];

  constructor(config: Partial<SkillEvolutionConfig> = {}) {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  async analyzeCapabilityGap(context: EvolutionContext): Promise<{
    hasGap: boolean;
    gapDescription?: string;
    suggestedSkillType?: string;
  }> {
    const { taskDescription, failedAttempts, existingSkills } = context;

    if (failedAttempts >= 2) {
      return {
        hasGap: true,
        gapDescription: `Agent failed ${failedAttempts} times for task: ${taskDescription}`,
        suggestedSkillType: this.inferSkillType(taskDescription),
      };
    }

    const keywords = this.extractKeywords(taskDescription);
    const relevantSkills = this.findRelevantSkills(keywords, existingSkills);

    if (relevantSkills.length === 0 && keywords.length > 0) {
      return {
        hasGap: true,
        gapDescription: `No existing skills match task keywords: ${keywords.join(', ')}`,
        suggestedSkillType: this.inferSkillType(taskDescription),
      };
    }

    return { hasGap: false };
  }

  private extractKeywords(description: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once']);

    return description
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private findRelevantSkills(keywords: string[], existingSkills: string[]): string[] {
    const relevant: string[] = [];
    for (const skillId of existingSkills) {
      const skill = this.skills.get(skillId);
      if (skill) {
        const skillWords = `${skill.name} ${skill.description}`.toLowerCase();
        if (keywords.some(kw => skillWords.includes(kw))) {
          relevant.push(skillId);
        }
      }
    }
    return relevant;
  }

  private inferSkillType(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('scan') || desc.includes('vulnerability')) return 'vulnerability';
    if (desc.includes('threat') || desc.includes('detect')) return 'threat_detection';
    if (desc.includes('incident') || desc.includes('respond')) return 'incident_response';
    if (desc.includes('compliance') || desc.includes('audit')) return 'compliance';
    if (desc.includes('analyze') || desc.includes('investigate')) return 'analysis';
    if (desc.includes('report') || desc.includes('document')) return 'reporting';
    if (desc.includes('configure') || desc.includes('deploy')) return 'configuration';

    return 'general';
  }

  async generateSkill(context: EvolutionContext): Promise<EvolvedSkill> {
    const skillId = `evolved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const skillType = this.inferSkillType(context.taskDescription);

    const skill: EvolvedSkill = {
      id: skillId,
      name: this.generateSkillName(skillType, context.taskDescription),
      description: context.taskDescription,
      layer: 'workspace' as SkillLayer,
      triggers: this.generateTriggers(context.taskDescription),
      instructions: this.generateInstructions(context),
      examples: this.generateExamples(context),
      tools: context.availableTools.slice(0, 5),
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: 'agent',
      testResults: [],
      status: 'draft',
      performance: {
        usageCount: 0,
        successRate: 0,
        avgExecutionTimeMs: 0,
      },
    };

    this.skills.set(skillId, skill);
    return skill;
  }

  private generateSkillName(type: string, description: string): string {
    const words = description.split(' ').slice(0, 4);
    const action = words[0] || 'execute';
    const target = words.slice(1).join(' ') || type;
    return `${action}_${target}`.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
  }

  private generateTriggers(description: string): string[] {
    const keywords = this.extractKeywords(description);
    return keywords.slice(0, 5).map(kw => `when asked about ${kw}`);
  }

  private generateInstructions(context: EvolutionContext): string {
    const { taskDescription, availableTools } = context;

    return `# Auto-Generated Skill

## Objective
${taskDescription}

## Approach
1. Analyze the request carefully
2. Use available tools to gather information
3. Process and synthesize findings
4. Provide actionable results

## Available Tools
${availableTools.slice(0, 5).map(t => `- ${t}`).join('\n')}

## Best Practices
- Verify all inputs before processing
- Document all findings clearly
- Prioritize security considerations
- Report any anomalies immediately

## Version History
- v1.0.0: Initial auto-generated version
`;
  }

  private generateExamples(context: EvolutionContext): Array<{ input: string; output: string }> {
    return [
      {
        input: `I need to ${context.taskDescription}`,
        output: `I'll help you with that. Let me analyze the situation and use the appropriate tools...`,
      },
    ];
  }

  async testSkill(skillId: string, testCases?: Array<{ input: string; expectedOutput?: string }>): Promise<SkillTestResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const testId = `test-${Date.now()}`;
    const errors: string[] = [];
    let score = 0;
    const metrics: Record<string, number> = {};

    if (!skill.name || skill.name.length < 3) {
      errors.push('Skill name is too short');
    } else {
      score += 0.2;
    }

    if (!skill.description || skill.description.length < 10) {
      errors.push('Skill description is too short');
    } else {
      score += 0.2;
    }

    if (!skill.instructions || skill.instructions.length < 50) {
      errors.push('Skill instructions are too brief');
    } else {
      score += 0.2;
    }

    if (!skill.triggers || skill.triggers.length === 0) {
      errors.push('No triggers defined');
    } else {
      score += 0.2;
    }

    if (!skill.tools || skill.tools.length === 0) {
      errors.push('No tools specified');
    } else {
      score += 0.2;
    }

    metrics.syntaxScore = errors.length === 0 ? 1 : 0.5;
    metrics.completenessScore = score;
    metrics.averageScore = score;

    const passed = score >= this.config.minTestScore;

    const result: SkillTestResult = {
      id: testId,
      executedAt: new Date(),
      passed,
      score,
      metrics,
      errors,
      feedback: passed ? 'Skill passed validation' : `Skill needs improvement: ${errors.join(', ')}`,
    };

    skill.testResults.push(result);
    skill.status = passed ? 'testing' : 'draft';

    return result;
  }

  async iterateSkill(skillId: string, feedback: string): Promise<EvolvedSkill | null> {
    const skill = this.skills.get(skillId);
    if (!skill) return null;

    const versionParts = skill.version.split('.').map(Number);
    versionParts[2]++;
    const newVersion = versionParts.join('.');

    const previousVersion = skill.version;
    skill.version = newVersion;
    skill.updatedAt = new Date();
    skill.parentSkillId = skillId;

    if (feedback.includes('instructions') || feedback.includes('unclear')) {
      skill.instructions = this.enhanceInstructions(skill.instructions, feedback);
    }

    if (feedback.includes('trigger') || feedback.includes('activate')) {
      const newTriggers = this.extractKeywords(feedback).map(kw => `when asked about ${kw}`);
      skill.triggers = [...new Set([...skill.triggers, ...newTriggers])];
    }

    skill.testResults = [];

    return skill;
  }

  private enhanceInstructions(current: string, feedback: string): string {
    const enhancements: string[] = [];

    if (feedback.includes('step')) {
      enhancements.push('\n\n## Additional Steps\n- Follow the procedure carefully\n- Validate each step before proceeding');
    }

    if (feedback.includes('error') || feedback.includes('fail')) {
      enhancements.push('\n\n## Error Handling\n- Handle errors gracefully\n- Provide clear error messages');
    }

    return current + enhancements.join('');
  }

  async approveSkill(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    const latestTest = skill.testResults[skill.testResults.length - 1];
    if (!latestTest || !latestTest.passed) {
      return false;
    }

    skill.status = 'approved';
    return true;
  }

  deprecateSkill(skillId: string, reason: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'deprecated';
    return true;
  }

  recordSkillUsage(skillId: string, success: boolean, executionTimeMs: number): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    skill.performance.usageCount++;
    skill.performance.lastUsed = new Date();

    const totalSuccess = skill.performance.successRate * (skill.performance.usageCount - 1) + (success ? 1 : 0);
    skill.performance.successRate = totalSuccess / skill.performance.usageCount;

    const totalTime = skill.performance.avgExecutionTimeMs * (skill.performance.usageCount - 1) + executionTimeMs;
    skill.performance.avgExecutionTimeMs = totalTime / skill.performance.usageCount;
  }

  getSkill(skillId: string): EvolvedSkill | undefined {
    return this.skills.get(skillId);
  }

  listSkills(status?: EvolvedSkill['status']): EvolvedSkill[] {
    const skills = Array.from(this.skills.values());
    if (status) {
      return skills.filter(s => s.status === status);
    }
    return skills;
  }

  getEvolutionHistory(): typeof this.evolutionHistory {
    return this.evolutionHistory;
  }

  getStats(): {
    totalSkills: number;
    approvedSkills: number;
    draftSkills: number;
    avgSuccessRate: number;
    avgTestScore: number;
  } {
    const skills = Array.from(this.skills.values());
    const approved = skills.filter(s => s.status === 'approved');
    const draft = skills.filter(s => s.status === 'draft');

    const avgSuccessRate = skills.length > 0
      ? skills.reduce((sum, s) => sum + s.performance.successRate, 0) / skills.length
      : 0;

    const avgTestScore = skills.length > 0
      ? skills.reduce((sum, s) => {
          const latest = s.testResults[s.testResults.length - 1];
          return sum + (latest?.score ?? 0);
        }, 0) / skills.length
      : 0;

    return {
      totalSkills: skills.length,
      approvedSkills: approved.length,
      draftSkills: draft.length,
      avgSuccessRate,
      avgTestScore,
    };
  }
}

export function createCapabilityEvolver(config?: Partial<SkillEvolutionConfig>): CapabilityEvolver {
  return new CapabilityEvolver(config);
}
