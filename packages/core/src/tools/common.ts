import {
  Tool,
  ToolParameter,
  ToolResult,
  ToolContext,
  SecurityTool,
  Severity,
} from "./types.js";

export class ToolExecutionError extends Error {
  readonly status: number;
  readonly toolName: string;

  constructor(toolName: string, message: string, status: number = 500) {
    super(message);
    this.name = "ToolExecutionError";
    this.toolName = toolName;
    this.status = status;
  }
}

export function createSuccessResult(data: unknown, metadata?: Record<string, unknown>): ToolResult {
  return {
    success: true,
    data,
    metadata,
  };
}

export function createErrorResult(
  error: string,
  status: number = 500,
  metadata?: Record<string, unknown>,
): ToolResult {
  return {
    success: false,
    error,
    metadata: { ...metadata, status },
  };
}

export function validateRequiredParams(
  params: Record<string, unknown>,
  required: string[],
): void {
  for (const param of required) {
    if (params[param] === undefined || params[param] === null) {
      throw new ToolExecutionError("validation", `Missing required parameter: ${param}`, 400);
    }
  }
}

export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; default?: string; trim?: boolean },
): string | undefined {
  const value = params[key];
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new ToolExecutionError("validation", `Parameter '${key}' is required`, 400);
    }
    return options?.default;
  }

  if (typeof value !== "string") {
    throw new ToolExecutionError("validation", `Parameter '${key}' must be a string`, 400);
  }

  return options?.trim !== false ? value.trim() : value;
}

export function readNumberParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; default?: number; integer?: boolean },
): number | undefined {
  const value = params[key];
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new ToolExecutionError("validation", `Parameter '${key}' is required`, 400);
    }
    return options?.default;
  }

  let num: number;
  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    num = Number.parseFloat(value);
  } else {
    throw new ToolExecutionError("validation", `Parameter '${key}' must be a number`, 400);
  }

  if (!Number.isFinite(num)) {
    throw new ToolExecutionError("validation", `Parameter '${key}' must be a valid number`, 400);
  }

  return options?.integer ? Math.trunc(num) : num;
}

export function readBooleanParam(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; default?: boolean },
): boolean {
  const value = params[key];
  if (value === undefined || value === null) {
    return options?.default ?? false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
  }

  throw new ToolExecutionError("validation", `Parameter '${key}' must be a boolean`, 400);
}

export function readArrayParam<T>(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; default?: T[]; itemType?: string },
): T[] | undefined {
  const value = params[key];
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new ToolExecutionError("validation", `Parameter '${key}' is required`, 400);
    }
    return options?.default;
  }

  if (!Array.isArray(value)) {
    throw new ToolExecutionError("validation", `Parameter '${key}' must be an array`, 400);
  }

  return value as T[];
}

export function isSecurityTool(tool: Tool): tool is SecurityTool {
  return "mitreTechniques" in tool || "scfControls" in tool || "severity" in tool;
}

export function getToolSeverity(tool: Tool): Severity | undefined {
  if (isSecurityTool(tool)) {
    return tool.severity;
  }
  return undefined;
}

export function getToolMitres(tool: Tool): string[] {
  if (isSecurityTool(tool)) {
    return tool.mitreTechniques ?? [];
  }
  return [];
}

export function getToolSCFControls(tool: Tool): string[] {
  if (isSecurityTool(tool)) {
    return tool.scfControls ?? [];
  }
  return [];
}

export function buildToolSchema(tool: Tool): object {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: tool.schema.parameters.properties,
      required: tool.schema.parameters.required,
    },
  };
}

export function createToolContext(
  sessionId: string,
  agentId: string,
  userId: string,
  options?: {
    workspaceDir?: string;
    metadata?: Record<string, unknown>;
  },
): ToolContext {
  return {
    sessionId,
    agentId,
    userId,
    workspaceDir: options?.workspaceDir,
    metadata: options?.metadata,
  };
}

export function parseToolName(toolName: string): { namespace?: string; name: string } {
  const parts = toolName.split("/");
  if (parts.length === 2) {
    return { namespace: parts[0], name: parts[1] };
  }
  return { name: toolName };
}

export function formatToolResult(result: ToolResult): string {
  if (result.success) {
    if (typeof result.data === "string") {
      return result.data;
    }
    return JSON.stringify(result.data, null, 2);
  }
  return `Error: ${result.error}`;
}

export function mergeToolMetadata(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return { ...base, ...override };
}

export function calculateToolRiskScore(tool: Tool): number {
  let score = 0;

  if (isSecurityTool(tool)) {
    switch (tool.severity) {
      case Severity.CRITICAL:
        score += 100;
        break;
      case Severity.HIGH:
        score += 75;
        break;
      case Severity.MEDIUM:
        score += 50;
        break;
      case Severity.LOW:
        score += 25;
        break;
      case Severity.INFO:
        score += 10;
        break;
    }

    if (tool.mitreTechniques) {
      score += tool.mitreTechniques.length * 5;
    }

    if (tool.scfControls) {
      score += tool.scfControls.length * 3;
    }
  }

  return score;
}
