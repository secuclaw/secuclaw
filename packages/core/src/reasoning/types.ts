export type ReasoningStrategyType = 'cot' | 'tot' | 'react' | 'plan_and_execute';

export interface ReasoningStrategyInterface {
  name: string;
  execute(context: ReasoningContext, config: ReasoningConfig): Promise<ReasoningResult>;
}

export interface ThoughtStep {
  id: string;
  type: 'observation' | 'analysis' | 'hypothesis' | 'deduction' | 'action' | 'reflection';
  content: string;
  confidence: number;
  evidence: string[];
  dependencies: string[];
  timestamp: Date;
}

export interface ReasoningChain {
  id: string;
  strategy: ReasoningStrategyType;
  goal: string;
  steps: ThoughtStep[];
  conclusion: string | null;
  confidence: number;
  status: 'in_progress' | 'completed' | 'failed' | 'abandoned';
  createdAt: Date;
  completedAt?: Date;
}

export interface ThoughtNode {
  id: string;
  thought: ThoughtStep;
  children: ThoughtNode[];
  parent: ThoughtNode | null;
  score: number;
  isTerminal: boolean;
  isSelected: boolean;
}

export interface ReasoningContext {
  query: string;
  availableTools: string[];
  previousChains: ReasoningChain[];
  constraints: string[];
  maxSteps: number;
  minConfidence: number;
}

export interface ReasoningResult {
  chain: ReasoningChain;
  conclusion: string;
  confidence: number;
  reasoning: string;
  nextSteps?: string[];
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  toolId: string;
  params: Record<string, unknown>;
  result?: unknown;
}

export interface ReasoningConfig {
  strategy: ReasoningStrategyType;
  maxDepth: number;
  beamWidth: number;
  temperature: number;
  includeReflection: boolean;
  validateSteps: boolean;
}

export const defaultReasoningConfig: ReasoningConfig = {
  strategy: 'cot',
  maxDepth: 10,
  beamWidth: 3,
  temperature: 0.7,
  includeReflection: true,
  validateSteps: true,
};

export type SecurityReasoningTask = 
  | 'threat_analysis'
  | 'incident_investigation'
  | 'vulnerability_assessment'
  | 'risk_evaluation'
  | 'attack_path_analysis'
  | 'ioc_correlation'
  | 'malware_analysis'
  | 'forensic_investigation';

export interface SecurityReasoningRequest {
  taskType: SecurityReasoningTask;
  context: ReasoningContext;
  config?: Partial<ReasoningConfig>;
}

export interface SecurityReasoningResponse {
  result: ReasoningResult;
  mitreMapping?: {
    tactics: string[];
    techniques: string[];
  };
  recommendations: string[];
  confidence: number;
}
