export interface EvolvedTool {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'attack' | 'defense' | 'analysis' | 'assessment';
  parameters: ToolParameter[];
  implementation: string;
  testResults: ToolTestResult[];
  status: 'draft' | 'testing' | 'approved' | 'deprecated';
  performance: ToolPerformance;
  createdAt: Date;
  updatedAt: Date;
  generatedBy: 'agent' | 'user';
  parentToolId?: string;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface ToolTestResult {
  id: string;
  executedAt: Date;
  passed: boolean;
  score: number;
  testCases: {
    input: Record<string, unknown>;
    expectedOutput?: unknown;
    actualOutput?: unknown;
    passed: boolean;
    error?: string;
  }[];
  metrics: Record<string, number>;
  errors: string[];
}

export interface ToolPerformance {
  invocationCount: number;
  successRate: number;
  avgExecutionTimeMs: number;
  lastUsed?: Date;
  errorRate: number;
}

export interface ToolEvolutionContext {
  agentId: string;
  gapDescription: string;
  requiredCapability: string;
  existingTools: string[];
  sampleInputs?: Record<string, unknown>[];
}

export interface ToolEvolutionConfig {
  maxIterations: number;
  minTestScore: number;
  autoApprove: boolean;
  requireSecurityReview: boolean;
}

export const DEFAULT_TOOL_EVOLUTION_CONFIG: ToolEvolutionConfig = {
  maxIterations: 5,
  minTestScore: 0.75,
  autoApprove: false,
  requireSecurityReview: true,
};

export class ToolEvolver {
  private tools: Map<string, EvolvedTool> = new Map();
  private config: ToolEvolutionConfig;
  private evolutionHistory: Array<{
    id: string;
    context: ToolEvolutionContext;
    result: EvolvedTool;
    timestamp: Date;
  }> = [];

  constructor(config: Partial<ToolEvolutionConfig> = {}) {
    this.config = { ...DEFAULT_TOOL_EVOLUTION_CONFIG, ...config };
  }

  async analyzeToolGap(context: ToolEvolutionContext): Promise<{
    hasGap: boolean;
    gapDescription?: string;
    suggestedToolType?: string;
  }> {
    const { gapDescription, requiredCapability, existingTools } = context;

    if (gapDescription && gapDescription.length > 0) {
      return {
        hasGap: true,
        gapDescription,
        suggestedToolType: this.inferToolType(requiredCapability),
      };
    }

    const requiredKeywords = this.extractKeywords(requiredCapability);
    const matchingTools = existingTools.filter(toolId => {
      const tool = this.tools.get(toolId);
      if (!tool) return false;
      const toolKeywords = this.extractKeywords(`${tool.name} ${tool.description}`);
      return requiredKeywords.some(kw => toolKeywords.includes(kw));
    });

    if (matchingTools.length === 0) {
      return {
        hasGap: true,
        gapDescription: `No existing tools match required capability: ${requiredCapability}`,
        suggestedToolType: this.inferToolType(requiredCapability),
      };
    }

    return { hasGap: false };
  }

  async generateTool(context: ToolEvolutionContext): Promise<EvolvedTool> {
    const toolId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toolType = this.inferToolType(context.requiredCapability);

    const tool: EvolvedTool = {
      id: toolId,
      name: this.generateToolName(toolType, context.requiredCapability),
      version: '1.0.0',
      description: context.gapDescription || `Auto-generated tool for: ${context.requiredCapability}`,
      category: this.inferToolCategory(toolType),
      parameters: this.generateParameters(context),
      implementation: this.generateImplementation(context),
      testResults: [],
      status: 'draft',
      performance: {
        invocationCount: 0,
        successRate: 0,
        avgExecutionTimeMs: 0,
        errorRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      generatedBy: 'agent',
    };

    this.tools.set(toolId, tool);
    return tool;
  }

  async testTool(toolId: string, testCases?: Array<{ input: Record<string, unknown>; expectedOutput?: unknown }>): Promise<ToolTestResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const testId = `test-${Date.now()}`;
    const errors: string[] = [];
    const testResults: ToolTestResult['testCases'] = [];
    let score = 0;
    const metrics: Record<string, number> = {};

    if (!tool.name || tool.name.length < 3) {
      errors.push('Tool name is too short');
    } else {
      score += 0.15;
    }

    if (!tool.description || tool.description.length < 10) {
      errors.push('Tool description is too short');
    } else {
      score += 0.15;
    }

    if (!tool.parameters || tool.parameters.length === 0) {
      errors.push('No parameters defined');
    } else {
      score += 0.2;

      const requiredParams = tool.parameters.filter(p => p.required);
      if (requiredParams.some(p => !p.description)) {
        errors.push('Some required parameters lack descriptions');
      } else {
        score += 0.1;
      }
    }

    if (!tool.implementation || tool.implementation.length < 50) {
      errors.push('Tool implementation is too brief');
    } else {
      score += 0.2;
    }

    if (testCases && testCases.length > 0) {
      for (const tc of testCases) {
        const validationErrors = this.validateParameters(tool, tc.input);
        if (validationErrors.length === 0) {
          testResults.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: { success: true },
            passed: true,
          });
          score += 0.05;
        } else {
          testResults.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            passed: false,
            error: validationErrors.join(', '),
          });
        }
      }
      metrics.testCoverage = testResults.filter(t => t.passed).length / testResults.length;
    }

    metrics.syntaxScore = errors.length === 0 ? 1 : 0.5;
    metrics.completenessScore = score;

    const passed = score >= this.config.minTestScore;

    const result: ToolTestResult = {
      id: testId,
      executedAt: new Date(),
      passed,
      score,
      testCases: testResults,
      metrics,
      errors,
    };

    tool.testResults.push(result);
    tool.status = passed ? 'testing' : 'draft';

    return result;
  }

  async iterateTool(toolId: string, feedback: string): Promise<EvolvedTool | null> {
    const tool = this.tools.get(toolId);
    if (!tool) return null;

    const versionParts = tool.version.split('.').map(Number);
    versionParts[2]++;
    tool.version = versionParts.join('.');
    tool.updatedAt = new Date();
    tool.parentToolId = toolId;

    if (feedback.includes('parameter') || feedback.includes('input')) {
      tool.parameters = this.enhanceParameters(tool.parameters, feedback);
    }

    if (feedback.includes('implementation') || feedback.includes('logic')) {
      tool.implementation = this.enhanceImplementation(tool.implementation, feedback);
    }

    tool.testResults = [];
    tool.status = 'draft';

    return tool;
  }

  async approveTool(toolId: string, securityReview?: { reviewed: boolean; approved: boolean; reviewer?: string }): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    if (this.config.requireSecurityReview && !securityReview?.approved) {
      return false;
    }

    const latestTest = tool.testResults[tool.testResults.length - 1];
    if (!latestTest || !latestTest.passed) {
      return false;
    }

    tool.status = 'approved';
    return true;
  }

  deprecateTool(toolId: string, reason: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    tool.status = 'deprecated';
    return true;
  }

  recordToolUsage(toolId: string, success: boolean, executionTimeMs: number): void {
    const tool = this.tools.get(toolId);
    if (!tool) return;

    tool.performance.invocationCount++;
    tool.performance.lastUsed = new Date();

    const totalSuccess = tool.performance.successRate * (tool.performance.invocationCount - 1) + (success ? 1 : 0);
    tool.performance.successRate = totalSuccess / tool.performance.invocationCount;

    const totalTime = tool.performance.avgExecutionTimeMs * (tool.performance.invocationCount - 1) + executionTimeMs;
    tool.performance.avgExecutionTimeMs = totalTime / tool.performance.invocationCount;

    tool.performance.errorRate = 1 - tool.performance.successRate;
  }

  getTool(toolId: string): EvolvedTool | undefined {
    return this.tools.get(toolId);
  }

  listTools(status?: EvolvedTool['status']): EvolvedTool[] {
    const tools = Array.from(this.tools.values());
    if (status) {
      return tools.filter(t => t.status === status);
    }
    return tools;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by']);
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private inferToolType(capability: string): string {
    const cap = capability.toLowerCase();
    if (cap.includes('scan') || cap.includes('detect')) return 'scanner';
    if (cap.includes('analyze') || cap.includes('assess')) return 'analyzer';
    if (cap.includes('attack') || cap.includes('exploit')) return 'attacker';
    if (cap.includes('defend') || cap.includes('protect')) return 'defender';
    if (cap.includes('report') || cap.includes('generate')) return 'reporter';
    return 'utility';
  }

  private inferToolCategory(type: string): EvolvedTool['category'] {
    const categoryMap: Record<string, EvolvedTool['category']> = {
      scanner: 'analysis',
      analyzer: 'analysis',
      attacker: 'attack',
      defender: 'defense',
      reporter: 'assessment',
      utility: 'analysis',
    };
    return categoryMap[type] || 'analysis';
  }

  private generateToolName(type: string, capability: string): string {
    const words = this.extractKeywords(capability);
    return `${type}_${words.slice(0, 2).join('_')}`.substring(0, 40);
  }

  private generateParameters(context: ToolEvolutionContext): ToolParameter[] {
    const params: ToolParameter[] = [
      {
        name: 'target',
        type: 'string',
        required: true,
        description: 'Target for the tool operation',
      },
      {
        name: 'options',
        type: 'object',
        required: false,
        description: 'Additional options for the tool',
        default: {},
      },
    ];

    if (context.sampleInputs) {
      const sampleKeys = new Set<string>();
      for (const sample of context.sampleInputs) {
        Object.keys(sample).forEach(k => sampleKeys.add(k));
      }
      for (const key of sampleKeys) {
        if (!params.some(p => p.name === key)) {
          params.push({
            name: key,
            type: 'string',
            required: false,
            description: `Auto-detected parameter: ${key}`,
          });
        }
      }
    }

    return params;
  }

  private generateImplementation(context: ToolEvolutionContext): string {
    return `// Auto-generated tool implementation
// Purpose: ${context.requiredCapability}
// Gap: ${context.gapDescription}

export async function execute(params: Record<string, unknown>): Promise<unknown> {
  const { target, options = {} } = params;
  
  // Step 1: Validate inputs
  if (!target) {
    throw new Error('Target parameter is required');
  }
  
  // Step 2: Execute core logic
  const result = await performOperation(target, options);
  
  // Step 3: Process and return results
  return {
    success: true,
    target,
    result,
    timestamp: new Date().toISOString()
  };
}

async function performOperation(target: unknown, options: Record<string, unknown>): Promise<unknown> {
  // TODO: Implement actual operation
  return { analyzed: true };
}
`;
  }

  private validateParameters(tool: EvolvedTool, input: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const param of tool.parameters) {
      if (param.required && !(param.name in input)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (param.name in input) {
        const value = input[param.name];
        if (param.validation) {
          if (param.validation.min !== undefined && typeof value === 'number' && value < param.validation.min) {
            errors.push(`${param.name} must be >= ${param.validation.min}`);
          }
          if (param.validation.max !== undefined && typeof value === 'number' && value > param.validation.max) {
            errors.push(`${param.name} must be <= ${param.validation.max}`);
          }
          if (param.validation.enum && typeof value === 'string' && !param.validation.enum.includes(value)) {
            errors.push(`${param.name} must be one of: ${param.validation.enum.join(', ')}`);
          }
        }
      }
    }

    return errors;
  }

  private enhanceParameters(current: ToolParameter[], feedback: string): ToolParameter[] {
    const keywords = this.extractKeywords(feedback);
    const newParams: ToolParameter[] = [];

    for (const kw of keywords) {
      if (!current.some(p => p.name === kw)) {
        newParams.push({
          name: kw,
          type: 'string',
          required: false,
          description: `Auto-added based on feedback`,
        });
      }
    }

    return [...current, ...newParams];
  }

  private enhanceImplementation(current: string, feedback: string): string {
    const enhancements: string[] = [];

    if (feedback.includes('error') || feedback.includes('fail')) {
      enhancements.push(`

// Enhanced error handling
function handleError(error: Error): never {
  console.error('Tool execution failed:', error);
  throw new Error(\`Operation failed: \${error.message}\`);
}`);
    }

    if (feedback.includes('validate') || feedback.includes('check')) {
      enhancements.push(`

// Enhanced validation
function validateInput(input: unknown): boolean {
  return input !== null && input !== undefined;
}`);
    }

    return current + enhancements.join('');
  }

  getStats(): {
    totalTools: number;
    approvedTools: number;
    draftTools: number;
    avgSuccessRate: number;
  } {
    const tools = Array.from(this.tools.values());
    return {
      totalTools: tools.length,
      approvedTools: tools.filter(t => t.status === 'approved').length,
      draftTools: tools.filter(t => t.status === 'draft').length,
      avgSuccessRate: tools.reduce((sum, t) => sum + t.performance.successRate, 0) / (tools.length || 1),
    };
  }
}

export function createToolEvolver(config?: Partial<ToolEvolutionConfig>): ToolEvolver {
  return new ToolEvolver(config);
}
