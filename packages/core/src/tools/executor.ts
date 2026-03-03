import type { ITool, IToolContext, IToolResult } from "./trait.js";

export class ToolExecutor {
  async execute<TParams, TResult>(
    tool: ITool<TParams, TResult>,
    params: TParams,
    context: IToolContext,
  ): Promise<IToolResult<TResult>> {
    return tool.execute(params, context);
  }

  async executeWithTimeout<TParams, TResult>(
    tool: ITool<TParams, TResult>,
    params: TParams,
    context: IToolContext,
    timeoutMs: number,
  ): Promise<IToolResult<TResult>> {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeout = new Promise<IToolResult<TResult>>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `tool timeout: ${timeoutMs}ms`,
          duration: timeoutMs,
        });
      }, timeoutMs);
    });

    const execution = tool.execute(params, context);

    const result = await Promise.race([execution, timeout]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return result;
  }

  async executeInSandbox<TParams, TResult>(
    tool: ITool<TParams, TResult>,
    params: TParams,
    context: IToolContext,
  ): Promise<IToolResult<TResult>> {
    if (tool.capabilities.requiresApproval && !context.permissions.includes("approve:dangerous")) {
      return {
        success: false,
        error: "tool requires approval",
      };
    }
    return tool.execute(params, context);
  }

  async executeBatch<TParams, TResult>(
    input: Array<{ tool: ITool<TParams, TResult>; params: TParams }>,
    context: IToolContext,
  ): Promise<Array<IToolResult<TResult>>> {
    return Promise.all(input.map(({ tool, params }) => this.execute(tool, params, context)));
  }
}
