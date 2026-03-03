export type ToolPolicyAction = 'allow' | 'deny' | 'none';

export interface ToolPolicyRule {
  id: string;
  toolName: string;
  action: ToolPolicyAction;
  conditions?: ToolPolicyCondition[];
  priority: number;
  source: 'system' | 'tenant' | 'user' | 'session';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolPolicyCondition {
  type: 'role' | 'tenant' | 'session' | 'context' | 'time';
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains';
  value: unknown;
}

export interface ToolPolicyResult {
  allowed: boolean;
  action: ToolPolicyAction;
  matchedRule?: ToolPolicyRule;
  reason: string;
}

export interface ToolPolicyConfig {
  defaultAction: ToolPolicyAction;
  enableAuditLog: boolean;
  enableCache: boolean;
  cacheTTL: number;
}

export const DEFAULT_TOOL_POLICY_CONFIG: ToolPolicyConfig = {
  defaultAction: 'allow',
  enableAuditLog: true,
  enableCache: true,
  cacheTTL: 60000,
};
