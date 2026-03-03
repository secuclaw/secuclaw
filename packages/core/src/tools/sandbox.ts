import {
  SandboxConfig,
  SandboxContext,
  SandboxExecutionResult,
  Tool,
  ToolContext,
  ToolExecutor,
  ToolResult,
  ToolPolicyMode,
  ToolCategory,
} from "./types.js";

declare const setTimeout: (callback: () => void, ms: number) => unknown;
declare const clearTimeout: (id: unknown) => void;

let sandboxCounter = 0;

export function createSandboxId(): string {
  return `sandbox-${Date.now()}-${++sandboxCounter}`;
}

export function createSandboxConfig(
  options?: Partial<SandboxConfig>,
): SandboxConfig {
  return {
    enabled: options?.enabled ?? false,
    timeoutMs: options?.timeoutMs ?? 30000,
    memoryLimitMb: options?.memoryLimitMb,
    cpuLimit: options?.cpuLimit,
    networkAccess: options?.networkAccess ?? false,
    filesystemAccess: options?.filesystemAccess ?? "read",
  };
}

export function createSandboxContext(
  config: SandboxConfig,
  workspaceDir: string,
  options?: {
    workingDir?: string;
    env?: Record<string, string>;
  },
): SandboxContext {
  return {
    id: createSandboxId(),
    config,
    workspaceDir,
    workingDir: options?.workingDir ?? workspaceDir,
    env: options?.env,
  };
}

export function isSandboxEnabled(context: SandboxContext | undefined): boolean {
  return context?.config.enabled ?? false;
}

export function canExecuteInSandbox(
  tool: Tool,
  sandbox: SandboxContext,
): boolean {
  if (!sandbox.config.enabled) {
    return false;
  }

  if (
    sandbox.config.filesystemAccess === "none" &&
    requiresFilesystemAccess(tool)
  ) {
    return false;
  }

  if (!sandbox.config.networkAccess && requiresNetworkAccess(tool)) {
    return false;
  }

  return true;
}

function requiresFilesystemAccess(tool: Tool): boolean {
  const writeActions = ["write", "edit", "delete", "create"];
  return writeActions.some((action) =>
    tool.name.toLowerCase().includes(action),
  );
}

function requiresNetworkAccess(tool: Tool): boolean {
  const networkActions = ["fetch", "request", "http", "curl", "wget"];
  return networkActions.some((action) =>
    tool.name.toLowerCase().includes(action),
  );
}

export async function executeInSandbox<TParams extends Record<string, unknown>>(
  executor: ToolExecutor<TParams>,
  params: TParams,
  context: ToolContext,
  sandbox: SandboxContext,
): Promise<ToolResult> {
  const mockTool: Tool = {
    id: "mock",
    name: "",
    description: "",
    category: ToolCategory.UTILITY,
    schema: { name: "", description: "", parameters: { type: "object", properties: {} } },
    executor: executor as ToolExecutor,
    policy: { mode: ToolPolicyMode.ALLOW },
  };
  if (!canExecuteInSandbox(mockTool, sandbox)) {
    return {
      success: false,
      error: "Execution not allowed in sandbox environment",
    };
  }

  const startTime = Date.now();

  try {
    const result = await executeWithTimeout(
      executor,
      params,
      context,
      sandbox.config.timeoutMs,
    );

    return {
      ...result,
      metadata: {
        ...result.metadata,
        sandboxId: sandbox.id,
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        sandboxId: sandbox.id,
        durationMs: Date.now() - startTime,
      },
    };
  }
}

async function executeWithTimeout<TParams extends Record<string, unknown>>(
  executor: ToolExecutor<TParams>,
  params: TParams,
  context: ToolContext,
  timeoutMs: number,
): Promise<ToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timeoutId: any;
  
  return new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: `Execution timeout after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    executor(params, context)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  });
}

export function createSandboxExecutionResult(
  options: {
    success: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
  },
  durationMs?: number,
): SandboxExecutionResult {
  return {
    success: options.success,
    output: options.output,
    error: options.error,
    exitCode: options.exitCode,
    durationMs,
  };
}

export function validateSandboxConfig(config: SandboxConfig): boolean {
  if (config.timeoutMs <= 0 || config.timeoutMs > 300000) {
    return false;
  }

  if (config.memoryLimitMb !== undefined && config.memoryLimitMb <= 0) {
    return false;
  }

  if (config.cpuLimit !== undefined && (config.cpuLimit <= 0 || config.cpuLimit > 100)) {
    return false;
  }

  const validFsAccess: string[] = ["none", "read", "read-write"];
  const fsAccess = config.filesystemAccess ?? "read";
  if (!validFsAccess.includes(fsAccess)) {
    return false;
  }

  return true;
}
