import { describe, expect, it } from "vitest";
import { ToolExecutor } from "./executor.js";
import type { ITool } from "./trait.js";
import { ToolCategory } from "./types.js";

const mockTool: ITool<{ x: number }, number> = {
  id: "t1",
  name: "adder",
  description: "adds 1",
  category: ToolCategory.UTILITY,
  capabilities: {
    destructive: false,
    networkAccess: false,
    filesystemAccess: false,
    requiresApproval: false,
    estimatedTime: 5,
  },
  getSchema() {
    return { name: "adder", description: "", parameters: { type: "object", properties: {} } };
  },
  validateParams(params: unknown): params is { x: number } {
    return typeof (params as { x?: unknown }).x === "number";
  },
  async execute(params) {
    return { success: true, data: params.x + 1 };
  },
  getHelp() {
    return "help";
  },
  getExamples() {
    return [];
  },
};

describe("tool executor", () => {
  it("executes tool", async () => {
    const exec = new ToolExecutor();
    const result = await exec.execute(mockTool, { x: 1 }, {
      sessionId: "s",
      agentId: "a",
      userId: "u",
      permissions: [],
    });
    expect(result.success).toBe(true);
    expect(result.data).toBe(2);
  });
});
