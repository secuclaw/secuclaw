import type { ToolCategory, ToolSchema } from "./types.js";
import type { ITool, IToolCapabilities, IToolContext, IToolResult, ToolExample } from "./trait.js";

export abstract class BaseTool<TParams, TResult> implements ITool<TParams, TResult> {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: ToolCategory;
  abstract readonly capabilities: IToolCapabilities;

  abstract getSchema(): ToolSchema;
  abstract validateParams(params: unknown): params is TParams;
  protected abstract run(params: TParams, context: IToolContext): Promise<TResult>;

  async execute(params: TParams, context: IToolContext): Promise<IToolResult<TResult>> {
    const started = Date.now();

    try {
      if (!this.validateParams(params)) {
        return {
          success: false,
          error: "invalid-params",
          duration: Date.now() - started,
        };
      }

      const result = await this.run(params, context);
      return {
        success: true,
        data: result,
        duration: Date.now() - started,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - started,
      };
    }
  }

  getHelp(): string {
    return `${this.name}: ${this.description}`;
  }

  getExamples(): ToolExample[] {
    return [];
  }
}
