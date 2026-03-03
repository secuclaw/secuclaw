import type {
  ToolPolicyAction,
  ToolPolicyRule,
  ToolPolicyCondition,
  ToolPolicyResult,
  ToolPolicyConfig,
} from './types.js';
import { DEFAULT_TOOL_POLICY_CONFIG } from './types.js';

export interface PolicyEvaluationContext {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  roles?: string[];
  context?: Record<string, unknown>;
}

export class ToolPolicyManager {
  private rules: Map<string, ToolPolicyRule> = new Map();
  private rulesByTool: Map<string, Set<string>> = new Map();
  private config: ToolPolicyConfig;
  private cache: Map<string, { result: ToolPolicyResult; expires: number }> = new Map();
  private auditLog: Array<{
    timestamp: Date;
    toolName: string;
    context: PolicyEvaluationContext;
    result: ToolPolicyResult;
  }> = [];

  constructor(config: Partial<ToolPolicyConfig> = {}) {
    this.config = { ...DEFAULT_TOOL_POLICY_CONFIG, ...config };
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const defaultRules: Array<Omit<ToolPolicyRule, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        toolName: 'execute_shell',
        action: 'deny',
        priority: 100,
        source: 'system',
        description: 'Block shell execution by default',
        conditions: [{ type: 'role', operator: 'notIn', value: ['admin', 'security_expert'] }],
      },
      {
        toolName: 'scan_vulnerability',
        action: 'allow',
        priority: 50,
        source: 'system',
        description: 'Allow vulnerability scanning',
        conditions: [{ type: 'role', operator: 'in', value: ['admin', 'security_expert', 'analyst'] }],
      },
      {
        toolName: 'attack_simulation',
        action: 'allow',
        priority: 50,
        source: 'system',
        description: 'Allow attack simulation',
        conditions: [{ type: 'role', operator: 'in', value: ['admin', 'security_expert'] }],
      },
      {
        toolName: 'delete_data',
        action: 'deny',
        priority: 100,
        source: 'system',
        description: 'Block data deletion',
        conditions: [{ type: 'role', operator: 'notEquals', value: 'admin' }],
      },
    ];

    for (const rule of defaultRules) {
      this.addRule({
        ...rule,
        id: `default-${rule.toolName}-${rule.action}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  addRule(rule: ToolPolicyRule): void {
    this.rules.set(rule.id, rule);

    if (!this.rulesByTool.has(rule.toolName)) {
      this.rulesByTool.set(rule.toolName, new Set());
    }
    this.rulesByTool.get(rule.toolName)!.add(rule.id);

    this.clearCache();
  }

  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.delete(ruleId);
    const toolRules = this.rulesByTool.get(rule.toolName);
    if (toolRules) {
      toolRules.delete(ruleId);
    }

    this.clearCache();
    return true;
  }

  evaluate(toolName: string, context: PolicyEvaluationContext): ToolPolicyResult {
    const cacheKey = this.getCacheKey(toolName, context);
    
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.result;
      }
    }

    const applicableRules = this.getApplicableRules(toolName);
    
    if (applicableRules.length === 0) {
      const result: ToolPolicyResult = {
        allowed: this.config.defaultAction !== 'deny',
        action: this.config.defaultAction,
        reason: `No rules for tool '${toolName}', using default: ${this.config.defaultAction}`,
      };
      
      this.cacheResult(cacheKey, result);
      this.logAudit(toolName, context, result);
      return result;
    }

    applicableRules.sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions ?? [], context);
      
      if (conditionsMet) {
        const result: ToolPolicyResult = {
          allowed: rule.action === 'allow',
          action: rule.action,
          matchedRule: rule,
          reason: `Rule '${rule.id}' matched with action: ${rule.action}`,
        };

        this.cacheResult(cacheKey, result);
        this.logAudit(toolName, context, result);
        return result;
      }
    }

    const result: ToolPolicyResult = {
      allowed: this.config.defaultAction !== 'deny',
      action: this.config.defaultAction,
      reason: `No rules matched for tool '${toolName}', using default: ${this.config.defaultAction}`,
    };

    this.cacheResult(cacheKey, result);
    this.logAudit(toolName, context, result);
    return result;
  }

  private getApplicableRules(toolName: string): ToolPolicyRule[] {
    const rules: ToolPolicyRule[] = [];
    const toolRuleIds = this.rulesByTool.get(toolName);
    
    if (toolRuleIds) {
      for (const ruleId of toolRuleIds) {
        const rule = this.rules.get(ruleId);
        if (rule) rules.push(rule);
      }
    }

    const wildcardRuleIds = this.rulesByTool.get('*');
    if (wildcardRuleIds) {
      for (const ruleId of wildcardRuleIds) {
        const rule = this.rules.get(ruleId);
        if (rule) rules.push(rule);
      }
    }

    return rules;
  }

  private evaluateConditions(conditions: ToolPolicyCondition[], context: PolicyEvaluationContext): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      let value: unknown;

      switch (condition.type) {
        case 'role':
          value = context.roles ?? [];
          break;
        case 'tenant':
          value = context.tenantId;
          break;
        case 'session':
          value = context.sessionId;
          break;
        case 'context':
          value = context.context;
          break;
        case 'time':
          value = new Date().getHours();
          break;
        default:
          continue;
      }

      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: ToolPolicyCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'notEquals':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'contains':
        if (typeof value === 'string' && typeof condition.value === 'string') {
          return value.includes(condition.value);
        }
        if (Array.isArray(value)) {
          return value.includes(condition.value);
        }
        return false;
      default:
        return false;
    }
  }

  private getCacheKey(toolName: string, context: PolicyEvaluationContext): string {
    return `${toolName}:${context.tenantId ?? ''}:${context.userId ?? ''}:${JSON.stringify(context.roles ?? [])}`;
  }

  private cacheResult(key: string, result: ToolPolicyResult): void {
    if (this.config.enableCache) {
      this.cache.set(key, {
        result,
        expires: Date.now() + this.config.cacheTTL,
      });
    }
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private logAudit(toolName: string, context: PolicyEvaluationContext, result: ToolPolicyResult): void {
    if (this.config.enableAuditLog) {
      this.auditLog.push({
        timestamp: new Date(),
        toolName,
        context,
        result,
      });
    }
  }

  getRule(ruleId: string): ToolPolicyRule | undefined {
    return this.rules.get(ruleId);
  }

  listRules(toolName?: string): ToolPolicyRule[] {
    if (toolName) {
      const ruleIds = this.rulesByTool.get(toolName);
      if (!ruleIds) return [];
      return Array.from(ruleIds).map(id => this.rules.get(id)!).filter(Boolean);
    }
    return Array.from(this.rules.values());
  }

  getAuditLog(limit?: number): typeof this.auditLog {
    const log = this.auditLog.slice().reverse();
    return limit ? log.slice(0, limit) : log;
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  getStats(): {
    totalRules: number;
    rulesByAction: Record<ToolPolicyAction, number>;
    rulesBySource: Record<string, number>;
    auditLogSize: number;
  } {
    const rulesByAction: Record<ToolPolicyAction, number> = { allow: 0, deny: 0, none: 0 };
    const rulesBySource: Record<string, number> = {};

    for (const rule of this.rules.values()) {
      rulesByAction[rule.action]++;
      rulesBySource[rule.source] = (rulesBySource[rule.source] ?? 0) + 1;
    }

    return {
      totalRules: this.rules.size,
      rulesByAction,
      rulesBySource,
      auditLogSize: this.auditLog.length,
    };
  }
}

let defaultManager: ToolPolicyManager | null = null;

export function getToolPolicyManager(): ToolPolicyManager {
  if (!defaultManager) {
    defaultManager = new ToolPolicyManager();
  }
  return defaultManager;
}

export function resetToolPolicyManager(): void {
  defaultManager = null;
}
