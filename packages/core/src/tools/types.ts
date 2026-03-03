export enum ToolCategory {
  ATTACK = "attack",
  DEFENSE = "defense",
  ANALYSIS = "analysis",
  ASSESSMENT = "assessment",
  UTILITY = "utility",
}

export enum ToolPolicyMode {
  ALLOW = "allow",
  DENY = "deny",
  NONE = "none",
}

export enum Severity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

export interface ToolParameter {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  default?: unknown;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export type ToolExecutor<TParams extends Record<string, unknown> = Record<string, unknown>> = (
  params: TParams,
  context: ToolContext,
) => Promise<ToolResult>;

export interface ToolContext {
  sessionId: string;
  agentId: string;
  userId: string;
  workspaceDir?: string;
  sandbox?: SandboxContext;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  schema: ToolSchema;
  executor: ToolExecutor;
  policy: ToolPolicy;
  ownerOnly?: boolean;
  enabled?: boolean;
}

export interface SecurityTool extends Tool {
  mitreTechniques?: string[];
  scfControls?: string[];
  severity?: Severity;
  tags?: string[];
}

export interface ToolPolicy {
  mode: ToolPolicyMode;
  allowList?: string[];
  denyList?: string[];
}

export interface ToolRegistration {
  tool: Tool;
  version: string;
  registeredAt: number;
}

export interface ToolRegistry {
  tools: Map<string, ToolRegistration>;
  categories: Map<ToolCategory, Set<string>>;
}

export interface SandboxConfig {
  enabled: boolean;
  timeoutMs: number;
  memoryLimitMb?: number;
  cpuLimit?: number;
  networkAccess?: boolean;
  filesystemAccess?: "none" | "read" | "read-write";
}

export interface SandboxContext {
  id: string;
  config: SandboxConfig;
  workspaceDir: string;
  workingDir: string;
  env?: Record<string, string>;
}

export interface SandboxExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  durationMs?: number;
}

export type ToolPolicyResolver = (
  toolName: string,
  context: ToolContext,
) => ToolPolicyMode;

export interface PolicyChainItem {
  name: string;
  resolver: ToolPolicyResolver;
  priority: number;
}

export interface ToolFilter {
  categories?: ToolCategory[];
  tags?: string[];
  search?: string;
}
