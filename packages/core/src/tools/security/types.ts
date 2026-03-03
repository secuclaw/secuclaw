import type { TSchema } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export interface ToolResultContent {
  type: 'text' | 'image' | 'json';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface SecurityToolResult<T = unknown> {
  success: boolean;
  content: ToolResultContent[];
  details?: T;
  metadata?: {
    duration?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    mitreTactics?: string[];
    mitreTechniques?: string[];
  };
  error?: string;
}

export type ToolExecutor<TParams, TResult = unknown> = (
  toolCallId: string,
  params: TParams,
  signal?: AbortSignal,
  onUpdate?: (progress: string) => void
) => Promise<SecurityToolResult<TResult>>;

export interface SecurityTool<TParams = any, TResult = unknown> {
  name: string;
  label: string;
  description: string;
  parameters: TSchema;
  execute: ToolExecutor<TParams, TResult>;
  category: SecurityToolCategory;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitreMapping?: {
    tactics: string[];
    techniques: string[];
  };
  optional?: boolean;
  requiresConfirmation?: boolean;
  timeout?: number;
}

export type SecurityToolCategory =
  | 'attack_simulation'
  | 'vulnerability_scanning'
  | 'threat_hunting'
  | 'incident_response'
  | 'security_analysis'
  | 'reconnaissance'
  | 'forensics'
  | 'compliance';

export const TargetSchema = Type.Object({
  target: Type.String({ description: 'Target identifier (URL, IP, domain, or hostname)' }),
});

export const TargetWithPortSchema = Type.Object({
  target: Type.String({ description: 'Target IP or hostname' }),
  port: Type.Optional(Type.Number({ description: 'Target port', minimum: 1, maximum: 65535 })),
});

export const SeveritySchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('medium'),
  Type.Literal('high'),
  Type.Literal('critical'),
], { default: 'medium', description: 'Severity level' });

export const ScanProfileSchema = Type.Union([
  Type.Literal('quick'),
  Type.Literal('standard'),
  Type.Literal('deep'),
  Type.Literal('stealth'),
], { default: 'standard', description: 'Scan profile' });

export interface ToolRegistryEntry {
  tool: SecurityTool<any, any>;
  enabled: boolean;
  allowedRoles: string[];
  lastUsed?: Date;
  usageCount: number;
}

export interface ToolExecutionContext {
  sessionId: string;
  userId: string;
  roles: string[];
  requestId: string;
  timeout?: number;
}

export type PolicyDecision = 'allow' | 'deny' | 'confirm';

export interface ToolPolicy {
  toolName: string | '*';
  action: PolicyDecision;
  conditions?: {
    roles?: string[];
    targets?: string[];
    timeWindow?: { start: string; end: string };
    maxUsage?: number;
  };
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  reason: string;
  appliedPolicies: string[];
}

export function createSuccessResult<T>(
  text: string,
  details?: T,
  metadata?: SecurityToolResult['metadata']
): SecurityToolResult<T> {
  return {
    success: true,
    content: [{ type: 'text', text }],
    details,
    metadata,
  };
}

export function createErrorResult<T = unknown>(
  error: string,
  metadata?: SecurityToolResult['metadata']
): SecurityToolResult<T> {
  return {
    success: false,
    content: [{ type: 'text', text: error }],
    error,
    metadata,
  };
}
