import type {
  ReasoningChain,
  ReasoningContext,
  ReasoningResult,
  ReasoningConfig,
  ThoughtStep,
  ThoughtNode,
  SecurityReasoningRequest,
  SecurityReasoningResponse,
  SecurityReasoningTask,
  ToolCall,
} from './types';

export interface ReasoningStrategy {
  name: string;
  execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult>;
}

export class ChainOfThoughtStrategy implements ReasoningStrategy {
  name = 'cot';

  async execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult> {
    const chain = this.createChain(context);
    const steps: ThoughtStep[] = [];
    let currentThought = context.query;
    
    for (let i = 0; i < config.maxDepth; i++) {
      const step = await this.generateThought(currentThought, steps, context, config);
      steps.push(step);
      
      if (step.type === 'deduction' && step.confidence >= context.minConfidence) {
        break;
      }
      
      currentThought = step.content;
    }

    chain.steps = steps;
    chain.status = 'completed';
    chain.conclusion = this.synthesizeConclusion(steps);
    chain.confidence = this.calculateConfidence(steps);
    chain.completedAt = new Date();

    return {
      chain,
      conclusion: chain.conclusion,
      confidence: chain.confidence,
      reasoning: this.formatReasoning(steps),
    };
  }

  private createChain(context: ReasoningContext): ReasoningChain {
    return {
      id: `chain_${Date.now()}`,
      strategy: 'cot',
      goal: context.query,
      steps: [],
      conclusion: null,
      confidence: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };
  }

  private async generateThought(
    currentThought: string,
    previousSteps: ThoughtStep[],
    context: ReasoningContext,
    config: ReasoningConfig,
  ): Promise<ThoughtStep> {
    const stepType = this.determineStepType(previousSteps.length);
    
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: stepType,
      content: currentThought,
      confidence: 0.8,
      evidence: [],
      dependencies: previousSteps.map(s => s.id),
      timestamp: new Date(),
    };
  }

  private determineStepType(stepIndex: number): ThoughtStep['type'] {
    if (stepIndex === 0) return 'observation';
    if (stepIndex === 1) return 'analysis';
    if (stepIndex === 2) return 'hypothesis';
    if (stepIndex >= 3) return 'deduction';
    return 'analysis';
  }

  private synthesizeConclusion(steps: ThoughtStep[]): string {
    const deductions = steps.filter(s => s.type === 'deduction');
    if (deductions.length > 0) {
      return deductions[deductions.length - 1].content;
    }
    return steps[steps.length - 1]?.content || '';
  }

  private calculateConfidence(steps: ThoughtStep[]): number {
    if (steps.length === 0) return 0;
    const weights = steps.map((_, i) => Math.pow(0.9, steps.length - i - 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return steps.reduce((sum, step, i) => sum + step.confidence * weights[i], 0) / totalWeight;
  }

  private formatReasoning(steps: ThoughtStep[]): string {
    return steps.map(s => `[${s.type.toUpperCase()}] ${s.content}`).join('\n\n');
  }
}

export class TreeOfThoughtStrategy implements ReasoningStrategy {
  name = 'tot';
  private beamWidth: number = 3;

  async execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult> {
    this.beamWidth = config.beamWidth;
    
    const chain: ReasoningChain = {
      id: `chain_${Date.now()}`,
      strategy: 'tot',
      goal: context.query,
      steps: [],
      conclusion: null,
      confidence: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };

    const rootNode = this.createNode({
      id: 'root',
      type: 'observation',
      content: context.query,
      confidence: 1,
      evidence: [],
      dependencies: [],
      timestamp: new Date(),
    });

    await this.expandTree(rootNode, context, config);
    
    const bestPath = this.findBestPath(rootNode);
    chain.steps = bestPath.map(n => n.thought);
    chain.conclusion = this.synthesizeConclusion(bestPath);
    chain.confidence = this.calculatePathConfidence(bestPath);
    chain.status = 'completed';
    chain.completedAt = new Date();

    return {
      chain,
      conclusion: chain.conclusion,
      confidence: chain.confidence,
      reasoning: this.formatTreeReasoning(bestPath),
    };
  }

  private createNode(thought: ThoughtStep, parent: ThoughtNode | null = null): ThoughtNode {
    return {
      id: `node_${thought.id}`,
      thought,
      children: [],
      parent,
      score: 0,
      isTerminal: false,
      isSelected: false,
    };
  }

  private async expandTree(
    node: ThoughtNode,
    context: ReasoningContext,
    config: ReasoningConfig,
    depth: number = 0,
  ): Promise<void> {
    if (depth >= config.maxDepth || node.isTerminal) {
      node.isTerminal = true;
      return;
    }

    const candidateThoughts = await this.generateCandidates(node, context, config);
    const scoredCandidates = candidateThoughts
      .map(t => ({ thought: t, score: this.evaluateThought(t, node) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.beamWidth);

    for (const candidate of scoredCandidates) {
      const childNode = this.createNode(candidate.thought, node);
      childNode.score = candidate.score;
      node.children.push(childNode);

      if (candidate.thought.confidence >= context.minConfidence) {
        childNode.isTerminal = true;
      } else {
        await this.expandTree(childNode, context, config, depth + 1);
      }
    }
  }

  private async generateCandidates(
    node: ThoughtNode,
    context: ReasoningContext,
    config: ReasoningConfig,
  ): Promise<ThoughtStep[]> {
    const types: ThoughtStep['type'][] = ['analysis', 'hypothesis', 'deduction'];
    
    return types.slice(0, this.beamWidth).map((type, i) => ({
      id: `candidate_${Date.now()}_${i}`,
      type,
      content: `Considering ${type} for: ${node.thought.content.slice(0, 50)}...`,
      confidence: 0.5 + Math.random() * 0.4,
      evidence: [],
      dependencies: [node.thought.id],
      timestamp: new Date(),
    }));
  }

  private evaluateThought(thought: ThoughtStep, parent: ThoughtNode): number {
    let score = thought.confidence;
    
    if (thought.type === 'deduction') score += 0.2;
    if (thought.evidence.length > 0) score += 0.1;
    
    if (parent) {
      score += parent.score * 0.3;
    }
    
    return Math.min(1, score);
  }

  private findBestPath(root: ThoughtNode): ThoughtNode[] {
    const paths: ThoughtNode[][] = [];
    
    const traverse = (node: ThoughtNode, path: ThoughtNode[]) => {
      const currentPath = [...path, node];
      
      if (node.isTerminal || node.children.length === 0) {
        paths.push(currentPath);
        return;
      }
      
      const sortedChildren = [...node.children].sort((a, b) => b.score - a.score);
      for (const child of sortedChildren.slice(0, 1)) {
        traverse(child, currentPath);
      }
    };
    
    traverse(root, []);
    
    if (paths.length === 0) return [root];
    
    return paths.reduce((best, current) => 
      this.calculatePathConfidence(current) > this.calculatePathConfidence(best) ? current : best
    );
  }

  private calculatePathConfidence(path: ThoughtNode[]): number {
    if (path.length === 0) return 0;
    const finalNode = path[path.length - 1];
    return finalNode.thought.confidence;
  }

  private synthesizeConclusion(path: ThoughtNode[]): string {
    const deductions = path.filter(n => n.thought.type === 'deduction');
    if (deductions.length > 0) {
      return deductions[deductions.length - 1].thought.content;
    }
    return path[path.length - 1]?.thought.content || '';
  }

  private formatTreeReasoning(path: ThoughtNode[]): string {
    return path.map(n => `[${n.thought.type.toUpperCase()}] (score: ${n.score.toFixed(2)}) ${n.thought.content}`).join('\n\n');
  }
}

export class ReActStrategy implements ReasoningStrategy {
  name = 'react';

  async execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult> {
    const chain: ReasoningChain = {
      id: `chain_${Date.now()}`,
      strategy: 'react',
      goal: context.query,
      steps: [],
      conclusion: null,
      confidence: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };

    const toolCalls: ToolCall[] = [];
    let iterations = 0;

    while (iterations < config.maxDepth) {
      const thoughtStep = await this.think(context, chain.steps);
      chain.steps.push(thoughtStep);

      if (this.shouldAct(thoughtStep, context)) {
        const actionStep = await this.act(thoughtStep, context);
        chain.steps.push(actionStep);
        
        if (actionStep.evidence.length > 0) {
          toolCalls.push({
            toolId: 'dynamic',
            params: { query: thoughtStep.content },
            result: actionStep.evidence,
          });
        }
      }

      if (this.isComplete(chain.steps, context.minConfidence)) {
        break;
      }

      iterations++;
    }

    chain.conclusion = this.synthesizeConclusion(chain.steps);
    chain.confidence = this.calculateConfidence(chain.steps);
    chain.status = 'completed';
    chain.completedAt = new Date();

    return {
      chain,
      conclusion: chain.conclusion,
      confidence: chain.confidence,
      reasoning: this.formatReActReasoning(chain.steps),
      toolCalls,
    };
  }

  private async think(context: ReasoningContext, previousSteps: ThoughtStep[]): Promise<ThoughtStep> {
    return {
      id: `think_${Date.now()}`,
      type: 'analysis',
      content: `Analyzing: ${context.query}`,
      confidence: 0.7,
      evidence: [],
      dependencies: previousSteps.map(s => s.id),
      timestamp: new Date(),
    };
  }

  private shouldAct(thought: ThoughtStep, context: ReasoningContext): boolean {
    return thought.confidence < context.minConfidence && context.availableTools.length > 0;
  }

  private async act(thought: ThoughtStep, context: ReasoningContext): Promise<ThoughtStep> {
    return {
      id: `act_${Date.now()}`,
      type: 'action',
      content: `Executing action based on: ${thought.content}`,
      confidence: 0.8,
      evidence: ['result_from_tool'],
      dependencies: [thought.id],
      timestamp: new Date(),
    };
  }

  private isComplete(steps: ThoughtStep[], minConfidence: number): boolean {
    const lastStep = steps[steps.length - 1];
    return lastStep?.type === 'deduction' && lastStep.confidence >= minConfidence;
  }

  private synthesizeConclusion(steps: ThoughtStep[]): string {
    const deductions = steps.filter(s => s.type === 'deduction');
    if (deductions.length > 0) {
      return deductions[deductions.length - 1].content;
    }
    const actions = steps.filter(s => s.type === 'action');
    if (actions.length > 0) {
      return `Based on ${actions.length} actions: ${actions[actions.length - 1].content}`;
    }
    return steps[steps.length - 1]?.content || '';
  }

  private calculateConfidence(steps: ThoughtStep[]): number {
    if (steps.length === 0) return 0;
    const weights = steps.map((_, i) => Math.pow(0.9, steps.length - i - 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return steps.reduce((sum, step, i) => sum + step.confidence * weights[i], 0) / totalWeight;
  }

  private formatReActReasoning(steps: ThoughtStep[]): string {
    return steps.map(s => {
      const prefix = s.type === 'analysis' ? 'THOUGHT' : 
                     s.type === 'action' ? 'ACTION' : 
                     s.type === 'observation' ? 'OBSERVATION' : 'STEP';
      return `[${prefix}] ${s.content}`;
    }).join('\n\n');
  }
}

export class PlanAndExecuteStrategy implements ReasoningStrategy {
  name = 'plan_and_execute';

  async execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult> {
    const chain: ReasoningChain = {
      id: `chain_${Date.now()}`,
      strategy: 'plan_and_execute',
      goal: context.query,
      steps: [],
      conclusion: null,
      confidence: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };

    const planSteps = await this.createPlan(context);
    
    for (const planStep of planSteps) {
      chain.steps.push(planStep);
      
      const executionStep = await this.executeStep(planStep, context, chain.steps);
      chain.steps.push(executionStep);
      
      if (executionStep.type === 'reflection' && executionStep.confidence < 0.5) {
        const revisedPlan = await this.revisePlan(chain.steps, context);
        planSteps.push(...revisedPlan);
      }
    }

    chain.conclusion = this.synthesizeConclusion(chain.steps);
    chain.confidence = this.calculateConfidence(chain.steps);
    chain.status = 'completed';
    chain.completedAt = new Date();

    return {
      chain,
      conclusion: chain.conclusion,
      confidence: chain.confidence,
      reasoning: this.formatPlanReasoning(chain.steps),
      nextSteps: this.identifyNextSteps(chain.steps),
    };
  }

  private async createPlan(context: ReasoningContext): Promise<ThoughtStep[]> {
    const steps: ThoughtStep[] = [];
    const subGoals = this.decomposeGoal(context.query);
    
    for (const subGoal of subGoals) {
      steps.push({
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'hypothesis',
        content: `Plan step: ${subGoal}`,
        confidence: 0.8,
        evidence: [],
        dependencies: [],
        timestamp: new Date(),
      });
    }
    
    return steps;
  }

  private decomposeGoal(goal: string): string[] {
    return [
      'Understand the context and constraints',
      'Identify key entities and relationships',
      'Analyze available evidence',
      'Formulate conclusion',
      'Validate and refine',
    ];
  }

  private async executeStep(
    planStep: ThoughtStep,
    context: ReasoningContext,
    previousSteps: ThoughtStep[],
  ): Promise<ThoughtStep> {
    return {
      id: `exec_${Date.now()}`,
      type: 'deduction',
      content: `Executed: ${planStep.content}`,
      confidence: 0.85,
      evidence: [],
      dependencies: [planStep.id, ...previousSteps.slice(-1).map(s => s.id)],
      timestamp: new Date(),
    };
  }

  private async revisePlan(steps: ThoughtStep[], context: ReasoningContext): Promise<ThoughtStep[]> {
    return [{
      id: `revise_${Date.now()}`,
      type: 'hypothesis',
      content: 'Revised plan: Adjust approach based on new findings',
      confidence: 0.75,
      evidence: [],
      dependencies: steps.map(s => s.id),
      timestamp: new Date(),
    }];
  }

  private synthesizeConclusion(steps: ThoughtStep[]): string {
    const executions = steps.filter(s => s.type === 'deduction');
    if (executions.length > 0) {
      return `Plan executed successfully: ${executions.length} steps completed`;
    }
    return 'Plan execution in progress';
  }

  private calculateConfidence(steps: ThoughtStep[]): number {
    if (steps.length === 0) return 0;
    const weights = steps.map((_, i) => Math.pow(0.9, steps.length - i - 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return steps.reduce((sum, step, i) => sum + step.confidence * weights[i], 0) / totalWeight;
  }

  private formatPlanReasoning(steps: ThoughtStep[]): string {
    return steps.map(s => {
      const prefix = s.type === 'hypothesis' ? 'PLAN' : 
                     s.type === 'deduction' ? 'EXECUTE' : 'STEP';
      return `[${prefix}] ${s.content}`;
    }).join('\n\n');
  }

  private identifyNextSteps(steps: ThoughtStep[]): string[] {
    const unexecuted = steps.filter(s => s.type === 'hypothesis' && 
      !steps.some(other => other.dependencies.includes(s.id)));
    return unexecuted.map(s => s.content);
  }
}
