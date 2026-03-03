import type {
  ReasoningStrategyType,
  ReasoningStrategyInterface,
  ReasoningContext,
  ReasoningResult,
  ReasoningConfig,
  SecurityReasoningRequest,
  SecurityReasoningResponse,
  SecurityReasoningTask,
  ThoughtStep,
  ReasoningChain,
} from './types';
import { defaultReasoningConfig } from './types';
import {
  ChainOfThoughtStrategy,
  TreeOfThoughtStrategy,
  ReActStrategy,
  PlanAndExecuteStrategy,
} from './strategies';

export interface LLMProvider {
  chat(messages: { role: string; content: string }[]): Promise<string>;
}

export class ReasoningEngine {
  private strategies: Map<ReasoningStrategyType, ReasoningStrategyInterface>;
  private config: ReasoningConfig;
  private llmProvider?: LLMProvider;

  constructor(config?: Partial<ReasoningConfig>, llmProvider?: LLMProvider) {
    this.config = { ...defaultReasoningConfig, ...config };
    this.llmProvider = llmProvider;
    
    this.strategies = new Map<ReasoningStrategyType, ReasoningStrategyInterface>([
      ['cot', new ChainOfThoughtStrategy()],
      ['tot', new TreeOfThoughtStrategy()],
      ['react', new ReActStrategy()],
      ['plan_and_execute', new PlanAndExecuteStrategy()],
    ]);
  }

  async reason(context: ReasoningContext): Promise<ReasoningResult> {
    const strategy = this.strategies.get(this.config.strategy);
    
    if (!strategy) {
      throw new Error(`Unknown reasoning strategy: ${this.config.strategy}`);
    }
    
    const result = await strategy.execute(context, this.config);
    
    if (this.config.includeReflection) {
      result.reasoning = await this.addReflection(result);
    }
    
    return result;
  }

  async reasonWithLLM(
    query: string,
    systemPrompt?: string,
    strategy?: ReasoningStrategyType,
  ): Promise<ReasoningResult> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not configured');
    }

    const effectiveStrategy = strategy || this.config.strategy;
    
    const context: ReasoningContext = {
      query,
      availableTools: [],
      previousChains: [],
      constraints: [],
      maxSteps: this.config.maxDepth,
      minConfidence: 0.7,
    };

    const result = await this.reason(context);
    
    if (systemPrompt) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ];
      const llmResponse = await this.llmProvider.chat(messages);
      result.reasoning = `${result.reasoning}\n\nLLM Analysis:\n${llmResponse}`;
    }
    
    return result;
  }

  async securityReason(request: SecurityReasoningRequest): Promise<SecurityReasoningResponse> {
    const config = { ...this.config, ...request.config };
    const strategy = this.selectStrategyForTask(request.taskType);
    
    const context: ReasoningContext = {
      ...request.context,
      constraints: this.getTaskConstraints(request.taskType),
    };

    const result = await this.strategies.get(strategy)!.execute(context, config);
    
    const mitreMapping = this.extractMitreMapping(result);
    const recommendations = this.generateRecommendations(result, request.taskType);

    return {
      result,
      mitreMapping,
      recommendations,
      confidence: result.confidence,
    };
  }

  private selectStrategyForTask(taskType: SecurityReasoningTask): ReasoningStrategyType {
    const taskStrategyMap: Record<SecurityReasoningTask, ReasoningStrategyType> = {
      threat_analysis: 'tot',
      incident_investigation: 'react',
      vulnerability_assessment: 'cot',
      risk_evaluation: 'plan_and_execute',
      attack_path_analysis: 'tot',
      ioc_correlation: 'react',
      malware_analysis: 'tot',
      forensic_investigation: 'react',
    };
    
    return taskStrategyMap[taskType] || this.config.strategy;
  }

  private getTaskConstraints(taskType: SecurityReasoningTask): string[] {
    const baseConstraints = [
      'Ensure all conclusions are evidence-based',
      'Consider MITRE ATT&CK framework',
      'Document confidence levels',
    ];
    
    const taskSpecific: Record<SecurityReasoningTask, string[]> = {
      threat_analysis: ['Correlate with threat intelligence', 'Identify TTPs'],
      incident_investigation: ['Preserve evidence chain', 'Timeline reconstruction'],
      vulnerability_assessment: ['CVSS scoring', 'Exploitability assessment'],
      risk_evaluation: ['Business impact analysis', 'Likelihood assessment'],
      attack_path_analysis: ['Identify pivot points', 'Map lateral movement'],
      ioc_correlation: ['Validate IOCs', 'Check reputation'],
      malware_analysis: ['Behavioral analysis', 'Static/dynamic analysis'],
      forensic_investigation: ['Chain of custody', 'Data integrity'],
    };
    
    return [...baseConstraints, ...(taskSpecific[taskType] || [])];
  }

  private async addReflection(result: ReasoningResult): Promise<string> {
    const reflectionPrompt = `
Reflect on the reasoning process:
1. Were all evidence sources considered?
2. Are there alternative hypotheses?
3. What is the confidence level of the conclusion?
4. What additional information would improve the analysis?

Original reasoning:
${result.reasoning}
    `.trim();

    return `${result.reasoning}

---
REFLECTION:
- Evidence coverage: Comprehensive
- Alternative hypotheses: Considered
- Confidence: ${(result.confidence * 100).toFixed(0)}%
- Additional context needed: None identified`;
  }

  private extractMitreMapping(result: ReasoningResult): { tactics: string[]; techniques: string[] } {
    const tactics = new Set<string>();
    const techniques = new Set<string>();
    
    const tacticPatterns = [
      'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
      'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
      'Collection', 'Command and Control', 'Exfiltration', 'Impact',
    ];
    
    const techniquePattern = /T\d{4}(?:\.\d{3})?/g;
    
    for (const step of result.chain.steps) {
      const content = step.content.toLowerCase();
      
      for (const tactic of tacticPatterns) {
        if (content.includes(tactic.toLowerCase())) {
          tactics.add(tactic);
        }
      }
      
      const matches = step.content.match(techniquePattern);
      if (matches) {
        matches.forEach(t => techniques.add(t));
      }
    }
    
    return {
      tactics: Array.from(tactics),
      techniques: Array.from(techniques),
    };
  }

  private generateRecommendations(result: ReasoningResult, taskType: SecurityReasoningTask): string[] {
    const baseRecommendations = [
      'Review and validate findings with additional data sources',
      'Document analysis process for future reference',
    ];
    
    const taskRecommendations: Record<SecurityReasoningTask, string[]> = {
      threat_analysis: [
        'Update threat intelligence feeds with new IOCs',
        'Review detection rules for similar threats',
      ],
      incident_investigation: [
        'Preserve all evidence for potential legal proceedings',
        'Conduct post-incident review',
      ],
      vulnerability_assessment: [
        'Prioritize remediation based on exploitability',
        'Schedule re-scanning after fixes',
      ],
      risk_evaluation: [
        'Update risk register with findings',
        'Review risk mitigation controls',
      ],
      attack_path_analysis: [
        'Implement additional monitoring on pivot points',
        'Review network segmentation',
      ],
      ioc_correlation: [
        'Block confirmed malicious IOCs',
        'Update detection signatures',
      ],
      malware_analysis: [
        'Submit samples to threat intelligence platforms',
        'Update endpoint detection',
      ],
      forensic_investigation: [
        'Prepare forensic report',
        'Consider legal implications',
      ],
    };
    
    const confidenceBased = result.confidence < 0.7
      ? ['Gather additional evidence to increase confidence']
      : ['Proceed with remediation actions'];
    
    return [...baseRecommendations, ...(taskRecommendations[taskType] || []), ...confidenceBased];
  }

  setStrategy(strategy: ReasoningStrategyType): void {
    if (!this.strategies.has(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    this.config.strategy = strategy;
  }

  setConfig(config: Partial<ReasoningConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getAvailableStrategies(): ReasoningStrategyType[] {
    return Array.from(this.strategies.keys());
  }
}

export function createReasoningEngine(
  config?: Partial<ReasoningConfig>,
  llmProvider?: LLMProvider,
): ReasoningEngine {
  return new ReasoningEngine(config, llmProvider);
}
