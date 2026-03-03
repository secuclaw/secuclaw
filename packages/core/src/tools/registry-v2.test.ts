import { describe, expect, it } from "vitest";
import { ToolRegistryV2 } from "./registry.js";
import { ToolCategory } from "./types.js";
import type { ITool } from "./trait.js";

const mockTool: ITool = {
  id: "tool-1",
  name: "mock-tool",
  description: "mock",
  category: ToolCategory.UTILITY,
  capabilities: {
    destructive: false,
    networkAccess: false,
    filesystemAccess: false,
    requiresApproval: false,
    estimatedTime: 1,
  },
  getSchema() {
    return { name: "mock-tool", description: "", parameters: { type: "object", properties: {} } };
  },
  validateParams() { return true; },
  async execute() { return { success: true }; },
  getHelp() { return ""; },
  getExamples() { return []; },
};

describe("tool registry v2", () => {
  it("registers and searches", () => {
    const registry = new ToolRegistryV2();
    registry.register(mockTool);
    expect(registry.get("tool-1")).toBeDefined();
    expect(registry.getByCategory(ToolCategory.UTILITY)).toHaveLength(1);
    expect(registry.search("mock")).toHaveLength(1);
  });
});
