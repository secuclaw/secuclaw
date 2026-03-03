import type { 
  SecurityTool, 
  ToolRegistryEntry, 
  ToolExecutionContext,
  ToolPolicy,
  PolicyEvaluationResult,
  PolicyDecision 
} from './types';

export class SecurityToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map();
  private policies: ToolPolicy[] = [];
  private usageTracker: Map<string, number> = new Map();

  register(tool: SecurityTool, allowedRoles: string[] = []): void {
    this.tools.set(tool.name, {
      tool,
      enabled: true,
      allowedRoles,
      lastUsed: undefined,
      usageCount: 0,
    });
  }

  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  get(toolName: string): SecurityTool | undefined {
    return this.tools.get(toolName)?.tool;
  }

  getAll(): SecurityTool[] {
    return Array.from(this.tools.values()).map(entry => entry.tool);
  }

  getByCategory(category: string): SecurityTool[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  getEnabled(): SecurityTool[] {
    return Array.from(this.tools.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.tool);
  }

  enable(toolName: string): boolean {
    const entry = this.tools.get(toolName);
    if (entry) {
      entry.enabled = true;
      return true;
    }
    return false;
  }

  disable(toolName: string): boolean {
    const entry = this.tools.get(toolName);
    if (entry) {
      entry.enabled = false;
      return true;
    }
    return false;
  }

  addPolicy(policy: ToolPolicy): void {
    this.policies.push(policy);
  }

  removePolicy(index: number): boolean {
    if (index >= 0 && index < this.policies.length) {
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }

  evaluatePolicy(toolName: string, context: ToolExecutionContext): PolicyEvaluationResult {
    const appliedPolicies: string[] = [];
    let finalDecision: PolicyDecision = 'allow';
    let reason = 'No restrictive policies applied';

    for (const policy of this.policies) {
      if (policy.toolName !== toolName && policy.toolName !== '*') continue;

      const conditionsMet = this.checkConditions(policy, context);
      
      if (conditionsMet) {
        appliedPolicies.push(policy.toolName === '*' ? `wildcard:${policy.action}` : `${policy.toolName}:${policy.action}`);
        
        if (policy.action === 'deny') {
          finalDecision = 'deny';
          reason = `Denied by policy: ${policy.toolName}`;
          break;
        } else if (policy.action === 'confirm') {
          if (finalDecision === 'allow') {
            finalDecision = 'confirm';
            reason = `Requires confirmation: ${policy.toolName}`;
          }
        }
      }
    }

    const entry = this.tools.get(toolName);
    if (entry && entry.allowedRoles.length > 0) {
      const hasRole = context.roles.some(role => entry.allowedRoles.includes(role));
      if (!hasRole && finalDecision !== 'deny') {
        finalDecision = 'deny';
        reason = `User lacks required role for tool: ${toolName}`;
      }
    }

    if (entry?.tool.requiresConfirmation && finalDecision === 'allow') {
      finalDecision = 'confirm';
      reason = 'Tool requires explicit confirmation';
    }

    return { decision: finalDecision, reason, appliedPolicies };
  }

  private checkConditions(policy: ToolPolicy, context: ToolExecutionContext): boolean {
    if (!policy.conditions) return true;

    const { roles, timeWindow, maxUsage } = policy.conditions;

    if (roles && roles.length > 0) {
      const hasRole = context.roles.some(role => roles.includes(role));
      if (!hasRole) return false;
    }

    if (timeWindow) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = timeWindow.start.split(':').map(Number);
      const [endH, endM] = timeWindow.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (currentTime < startMinutes || currentTime > endMinutes) return false;
    }

    if (maxUsage !== undefined) {
      const key = `${context.userId}:${policy.toolName}`;
      const usage = this.usageTracker.get(key) || 0;
      if (usage >= maxUsage) return false;
    }

    return true;
  }

  trackUsage(toolName: string, userId: string): void {
    const key = `${userId}:${toolName}`;
    this.usageTracker.set(key, (this.usageTracker.get(key) || 0) + 1);
    
    const entry = this.tools.get(toolName);
    if (entry) {
      entry.usageCount++;
      entry.lastUsed = new Date();
    }
  }

  getUsageStats(toolName: string): { count: number; lastUsed?: Date } {
    const entry = this.tools.get(toolName);
    return {
      count: entry?.usageCount || 0,
      lastUsed: entry?.lastUsed,
    };
  }

  async execute<TResult>(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<import('./types').SecurityToolResult<TResult>> {
    const policyResult = this.evaluatePolicy(toolName, context);
    
    if (policyResult.decision === 'deny') {
      return {
        success: false,
        content: [{ type: 'text', text: policyResult.reason }],
        error: policyResult.reason,
      } as import('./types').SecurityToolResult<TResult>;
    }

    const entry = this.tools.get(toolName);
    if (!entry || !entry.enabled) {
      return {
        success: false,
        content: [{ type: 'text', text: `Tool not found or disabled: ${toolName}` }],
        error: `Tool not found or disabled: ${toolName}`,
      } as import('./types').SecurityToolResult<TResult>;
    }

    const tool = entry.tool;
    const timeout = tool.timeout || context.timeout || 30000;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await tool.execute(
        context.requestId,
        params,
        controller.signal
      );

      clearTimeout(timeoutId);
      
      this.trackUsage(toolName, context.userId);

      return {
        ...result,
        metadata: {
          ...result.metadata,
          duration: Date.now() - startTime,
        },
      } as import('./types').SecurityToolResult<TResult>;
    } catch (error) {
      return {
        success: false,
        content: [{ type: 'text', text: String(error) }],
        error: String(error),
        metadata: {
          duration: Date.now() - startTime,
          riskLevel: tool.riskLevel,
        },
      } as import('./types').SecurityToolResult<TResult>;
    }
  }

  getToolSchemas(): Array<{ name: string; description: string; parameters: unknown }> {
    return this.getEnabled().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}

export const globalToolRegistry = new SecurityToolRegistry();
