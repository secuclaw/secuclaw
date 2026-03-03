import type { ToolCategory, ToolContext as LegacyToolContext, ToolResult as LegacyToolResult, ToolSchema } from "./types.js";

export interface IToolCapabilities {
  readonly destructive: boolean;
  readonly networkAccess: boolean;
  readonly filesystemAccess: boolean;
  readonly requiresApproval: boolean;
  readonly estimatedTime: number;
}

export interface ToolExample {
  title: string;
  params: Record<string, unknown>;
}

export interface IToolContext extends LegacyToolContext {
  permissions: string[];
}

export interface IToolResult<T = unknown> extends LegacyToolResult {
  data?: T;
  duration?: number;
}

export interface ITool<TParams = unknown, TResult = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly capabilities: IToolCapabilities;

  getSchema(): ToolSchema;
  validateParams(params: unknown): params is TParams;
  execute(params: TParams, context: IToolContext): Promise<IToolResult<TResult>>;

  initialize?(): Promise<void>;
  dispose?(): Promise<void>;

  getHelp(): string;
  getExamples(): ToolExample[];
}
